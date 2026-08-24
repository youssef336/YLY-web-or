import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';

export class ListGlobalMeetingsUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(): Promise<GlobalMeeting[]> {
    return this.repository.listGlobalMeetings();
  }
}