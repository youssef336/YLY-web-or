/**
 * Core scoring business rules for the OER committee.
 *
 * ORMEMBER (OER) template layout (each row = one member):
 *   A        = Member name
 *   B        = Field Visits Entered (FORMULA, NEVER written)
 *   C..Q(15) = Field Visit scores (0/1)          /30
 *   S        = Meetings Entered (FORMULA, NEVER written)
 *   T..AH(15)= Meeting scores (0/1)              /30
 *   AJ       = Tasks Entered (FORMULA, NEVER written)
 *   AK..CT(30)= Task scores: 10 tasks × 3 columns (T, Q, D) each  /20
 *   CU       = Interaction /10                     (direct input)
 *   CV       = Respect Hierarchy /10               (direct input)
 *   CW       = Bonus /10                           (direct input)
 *
 * Visits /30 + Meetings /30 + Tasks /20 + Interaction /10 + Respect /10 + Bonus /10 = 110
 */
export const SCORING_LIMITS = {
  MAX_TASKS: 20,
  MAX_FIELD_VISITS: 30,
  MAX_MEETINGS: 30,
  MAX_INTERACTION: 10,
  MAX_RESPECT_HIERARCHY: 10,
  MAX_BONUS: 10,
  TOTAL: 110,
} as const;

export interface ScoreSummary {
  tasks: number; // /20 (sum of T×Q×D per task)
  fieldVisits: number; // /30 (normalized: avg x 30)
  meetings: number; // /30 (normalized: avg x 30)
  interaction: number; // /10
  respectHierarchy: number; // /10
  bonus: number; // /10
  total: number; // total
  percentage: number; // 0-100
  grade: string;
}

export const GRADE_BANDS = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'F' },
] as const;

export function clampScore(score: number, min: number, max: number): number {
  if (!Number.isFinite(score)) return min;
  return Math.min(max, Math.max(min, score));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface NormalizedCategory {
  /** Number of entries recorded. */
  count: number;
  /** Normalized score: avg(entry scores) * cap, rounded to 2 decimals. */
  score: number;
}

/**
 * Mirrors the template formulas for field visits and meetings:
 *   B = count of visit headers, C..Q = scores
 *   S = count of meeting headers, T..AH = scores
 */
export function normalizeCategory(entries: Array<{ score: number }>, cap: number): NormalizedCategory {
  if (entries.length === 0) return { count: 0, score: 0 };
  const sum = entries.reduce((acc, entry) => acc + clampScore(entry.score, 0, 1), 0);
  const avg = sum / entries.length;
  return { count: entries.length, score: Math.min(cap, round2(avg * cap)) };
}

/**
 * Calculate the total HR task score from an array of tasks.
 * Each task: score = T × Q × D (T,D ∈ {0, 0.25, 0.5, 1}, Q ∈ {1..5}).
 * Capped at MAX_TASKS (20).
 */
export function calculateHrTasksScore(
  tasks: Array<{ t: number; q: number; d: number }>,
): number {
  const raw = tasks.reduce((sum, task) => sum + task.t * task.q * task.d, 0);
  return Math.min(SCORING_LIMITS.MAX_TASKS, round2(raw));
}

export function percentageOf(total: number): number {
  return clampScore(round1((total / SCORING_LIMITS.TOTAL) * 100), 0, 100);
}

export function gradeOf(percentage: number): string {
  for (const band of GRADE_BANDS) {
    if (percentage >= band.min) return band.grade;
  }
  return GRADE_BANDS[GRADE_BANDS.length - 1].grade;
}

export function calculateScoreSummary(input: {
  tasks: Array<{ t: number; q: number; d: number }>;
  fieldVisits: Array<{ score: number }>;
  meetings: Array<{ score: number }>;
  interaction: number;
  respectHierarchy: number;
  bonus: number;
}): ScoreSummary {
  const tasks = calculateHrTasksScore(input.tasks);
  const fieldVisits = normalizeCategory(input.fieldVisits, SCORING_LIMITS.MAX_FIELD_VISITS);
  const meetings = normalizeCategory(input.meetings, SCORING_LIMITS.MAX_MEETINGS);
  const interaction = clampScore(input.interaction, 0, SCORING_LIMITS.MAX_INTERACTION);
  const respectHierarchy = clampScore(input.respectHierarchy, 0, SCORING_LIMITS.MAX_RESPECT_HIERARCHY);
  const bonus = clampScore(input.bonus, 0, SCORING_LIMITS.MAX_BONUS);

  const total = round2(tasks + fieldVisits.score + meetings.score + interaction + respectHierarchy + bonus);
  const percentage = percentageOf(total);
  const grade = gradeOf(percentage);

  return {
    tasks,
    fieldVisits: fieldVisits.score,
    meetings: meetings.score,
    interaction,
    respectHierarchy,
    bonus,
    total,
    percentage,
    grade,
  };
}

export function emptyScoreSummary(): ScoreSummary {
  return calculateScoreSummary({
    tasks: [],
    fieldVisits: [],
    meetings: [],
    interaction: 0,
    respectHierarchy: 0,
    bonus: 0,
  });
}
