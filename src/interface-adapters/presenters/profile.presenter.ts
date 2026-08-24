import type { MemberProfile } from '@/domain/entities/member-profile';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import type { HrTask } from '@/domain/entities/hr-task';

/**
 * Presenter (interface adapter): maps a domain MemberProfile aggregate to the
 * shape consumed by the Evaluation Profile screen. Global events are resolved
 * to their name/date so the UI never needs to know about globalEventId.
 */
export interface ProfileView {
  member: {
    id: string;
    name: string;
    createdAt: string;
  };
  fieldVisits: Array<{ id: string; globalEventId: string; name: string; date: string; score: number }>;
  meetings: Array<{ id: string; globalEventId: string; name: string; date: string; score: number }>;
  scores: {
    interaction: number;
    respectHierarchy: number;
    bonus: number;
  };
  hrTasks: HrTask[];
  summary: {
    tasks: number;
    fieldVisits: number;
    meetings: number;
    interaction: number;
    respectHierarchy: number;
    bonus: number;
    total: number;
    percentage: number;
    grade: string;
  };
}

export function profileToView(
  profile: MemberProfile,
  globalFieldVisits: GlobalFieldVisit[],
  globalMeetings: GlobalMeeting[],
): ProfileView {
  const globalVisitMap = new Map(globalFieldVisits.map((g) => [g.id, g]));
  const globalMeetingMap = new Map(globalMeetings.map((g) => [g.id, g]));

  return {
    member: {
      id: profile.member.id,
      name: profile.member.name,
      createdAt: profile.member.createdAt.toISOString(),
    },
    fieldVisits: profile.fieldVisits.map((fv) => {
      const global = globalVisitMap.get(fv.globalEventId);
      return {
        id: fv.id,
        globalEventId: fv.globalEventId,
        name: global?.name ?? '(deleted event)',
        date: global?.date ?? '',
        score: fv.score,
      };
    }),
    meetings: profile.meetings.map((m) => {
      const global = globalMeetingMap.get(m.globalEventId);
      return {
        id: m.id,
        globalEventId: m.globalEventId,
        name: global?.name ?? '(deleted event)',
        date: global?.date ?? '',
        score: m.score,
      };
    }),
    scores: {
      interaction: profile.scores?.interaction ?? 0,
      respectHierarchy: profile.scores?.respectHierarchy ?? 0,
      bonus: profile.scores?.bonus ?? 0,
    },
    hrTasks: profile.hrTasks ?? [],
    summary: profile.summary,
  };
}
