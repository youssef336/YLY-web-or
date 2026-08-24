import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { GlobalMeetingInput } from '@/application/dto/member.dto';
import { GlobalMeetingInputSchema } from '@/application/dto/member.dto';
import { parseOrThrow, newId } from './validation';

export class CreateGlobalMeetingUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(input: GlobalMeetingInput): Promise<void> {
    const data = parseOrThrow(GlobalMeetingInputSchema, input);
    await this.repository.createGlobalMeeting({
      id: newId(),
      name: data.name,
      date: data.date,
      createdAt: new Date(),
    });
  }
}