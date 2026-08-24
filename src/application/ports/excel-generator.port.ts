import type { MemberProfile } from '@/domain/entities/member-profile';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';

export interface ExcelGenerator {
  generateAll(input: {
    profiles: MemberProfile[];
    globalFieldVisits: GlobalFieldVisit[];
    globalMeetings: GlobalMeeting[];
  }): Promise<Uint8Array>;
}
