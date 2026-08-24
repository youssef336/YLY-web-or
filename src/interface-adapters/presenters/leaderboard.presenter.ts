import type { LeaderboardEntry } from '@/application/use-cases/calculate-leaderboard.use-case';

/**
 * Presenter (interface adapter): maps the application-layer leaderboard
 * result to the exact shape consumed by the dashboard UI.
 */
export interface LeaderboardMemberView {
  id: string;
  name: string;
  tasks: number;
  fieldVisits: number;
  meetings: number;
  interaction: number;
  respectHierarchy: number;
  bonus: number;
  total: number;
  percentage: number;
  grade: string;
  rank: number;
}

export function leaderboardToView(entry: LeaderboardEntry, rank: number): LeaderboardMemberView {
  return {
    id: entry.member.id,
    name: entry.member.name,
    tasks: entry.summary.tasks,
    fieldVisits: entry.summary.fieldVisits,
    meetings: entry.summary.meetings,
    interaction: entry.summary.interaction,
    respectHierarchy: entry.summary.respectHierarchy,
    bonus: entry.summary.bonus,
    total: entry.summary.total,
    percentage: entry.summary.percentage,
    grade: entry.summary.grade,
    rank,
  };
}

export function leaderboardToViews(entries: LeaderboardEntry[]): LeaderboardMemberView[] {
  return entries.map((entry, index) => leaderboardToView(entry, index + 1));
}
