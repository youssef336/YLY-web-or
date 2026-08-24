import type { LocalMemberRepository } from '@/application/ports/member-repository.port';

export class DeleteGlobalMeetingUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteGlobalMeeting(id);
  }
}