import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { MeetingInput } from '@/application/dto/member.dto';
import { MeetingInputSchema } from '@/application/dto/member.dto';
import { MemberNotFoundError } from './errors';
import { parseOrThrow } from './validation';

export class UpdateMeetingUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string, entryId: string, input: MeetingInput): Promise<void> {
    const data = parseOrThrow(MeetingInputSchema, input);
    const member = await this.repository.findById(memberId);
    if (!member) throw new MemberNotFoundError(memberId);
    await this.repository.updateMeeting(entryId, { score: data.score });
  }
}