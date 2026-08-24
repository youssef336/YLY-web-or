import type { Member } from '@/domain/entities/member';
import type { FieldVisit, FieldVisitScore } from '@/domain/entities/field-visit';
import type { Meeting, MeetingScore } from '@/domain/entities/meeting';
import type { CategoryScores } from '@/domain/entities/category-scores';
import type { MemberProfile } from '@/domain/entities/member-profile';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import type { HrTask, HrTaskScore, HrQualityScore } from '@/domain/entities/hr-task';

/**
 * Local repository port (output boundary).
 *
 * The domain/application layers only know this interface. The IndexedDB
 * adapter (web/PWA) in the infrastructure layer implements it.
 *
 * Field Visits and Meetings reference global events by ID. The repository
 * owns slot assignment: an entry reuses the slot of another entry with the
 * same globalEventId; otherwise it takes the next free slot.
 */
export interface LocalMemberRepository {
  createMember(member: Member): Promise<Member>;
  findById(id: string): Promise<Member | null>;
  findAll(): Promise<Member[]>;
  updateMemberName(id: string, name: string): Promise<Member>;
  deleteMember(id: string): Promise<void>;

  getCategoryScores(memberId: string): Promise<CategoryScores | null>;
  upsertCategoryScores(memberId: string, input: { interaction: number; respectHierarchy: number; bonus: number }): Promise<CategoryScores>;

  // Global events (independent of members)
  listGlobalFieldVisits(): Promise<GlobalFieldVisit[]>;
  createGlobalFieldVisit(input: GlobalFieldVisit): Promise<GlobalFieldVisit>;
  deleteGlobalFieldVisit(id: string): Promise<void>;

  listGlobalMeetings(): Promise<GlobalMeeting[]>;
  createGlobalMeeting(input: GlobalMeeting): Promise<GlobalMeeting>;
  deleteGlobalMeeting(id: string): Promise<void>;

  // Member entries (reference global events)
  addFieldVisit(input: {
    memberId: string;
    id: string;
    globalEventId: string;
    score: FieldVisitScore;
  }): Promise<FieldVisit>;
  updateFieldVisit(id: string, input: { score: FieldVisitScore }): Promise<FieldVisit>;
  removeFieldVisit(id: string): Promise<void>;

  addMeeting(input: { memberId: string; id: string; globalEventId: string; score: MeetingScore }): Promise<Meeting>;
  updateMeeting(id: string, input: { score: MeetingScore }): Promise<Meeting>;
  removeMeeting(id: string): Promise<void>;

  // HR Tasks
  listHrTasks(memberId: string): Promise<HrTask[]>;
  addHrTask(input: {
    memberId: string;
    id: string;
    taskIndex: number;
    name: string;
    date: string;
    t: HrTaskScore;
    q: HrQualityScore;
    d: HrTaskScore;
  }): Promise<HrTask>;
  updateHrTask(id: string, input: { t: HrTaskScore; q: HrQualityScore; d: HrTaskScore }): Promise<HrTask>;
  removeHrTask(id: string): Promise<void>;

  loadProfile(memberId: string): Promise<MemberProfile | null>;
}
