/**
 * HR Task entity — one task per member in the HR committee evaluation.
 *
 * Each task has three metrics:
 *   T (Submission/Task): 0 | 0.25 | 0.5 | 1
 *   Q (Quality): 1 | 2 | 3 | 4 | 5
 *   D (Deadline): 0 | 0.25 | 0.5 | 1
 */
export type HrTaskScore = 0 | 0.25 | 0.5 | 1;
export type HrQualityScore = 1 | 2 | 3 | 4 | 5;

export interface HrTask {
  id: string;
  memberId: string;
  taskIndex: number;
  name: string;
  /** Task date (ISO YYYY-MM-DD). Used for date-based merge matching. */
  date: string;
  t: HrTaskScore;
  q: HrQualityScore;
  d: HrTaskScore;
  createdAt: Date;
  updatedAt: Date;
}

/** Allowed T/D score values. */
export const HR_TASK_SCORE_OPTIONS: readonly HrTaskScore[] = [0, 0.25, 0.5, 1] as const;

/** Allowed Q score values. */
export const HR_QUALITY_SCORE_OPTIONS: readonly HrQualityScore[] = [1, 2, 3, 4, 5] as const;
