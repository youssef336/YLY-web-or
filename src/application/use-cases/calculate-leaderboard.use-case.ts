import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { Member } from '@/domain/entities/member';
import { emptyScoreSummary, type ScoreSummary } from '@/domain/score/scoring';

export interface LeaderboardEntry {
  member: Member;
  summary: ScoreSummary;
}

/**
 * Calculates the Home Page leaderboard.
 *
 * Business rule: members are ranked descending by Total Score (/110).
 * Ties are broken alphabetically by name to keep ordering deterministic.
 * Members with no evaluations rank at the bottom with an all-zero summary.
 */
export class CalculateLeaderboardUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(): Promise<LeaderboardEntry[]> {
    const members = await this.repository.findAll();

    const entries = await Promise.all(
      members.map(async (member): Promise<LeaderboardEntry> => {
        const profile = await this.repository.loadProfile(member.id);
        return {
          member,
          summary: profile ? profile.summary : emptyScoreSummary(),
        };
      }),
    );

    return entries.sort((a, b) => {
      if (b.summary.total !== a.summary.total) return b.summary.total - a.summary.total;
      return a.member.name.localeCompare(b.member.name);
    });
  }
}