import type { Member } from './member';
import type { FieldVisit } from './field-visit';
import type { Meeting } from './meeting';
import type { CategoryScores } from './category-scores';
import type { HrTask } from './hr-task';
import type { ScoreSummary } from '../score/scoring';

/**
 * Aggregate root for a single member's full evaluation state.
 * Repositories return this object; use cases operate on it.
 */
export interface MemberProfile {
  member: Member;
  fieldVisits: FieldVisit[];
  meetings: Meeting[];
  scores: CategoryScores | null;
  hrTasks: HrTask[];
  summary: ScoreSummary;
}
