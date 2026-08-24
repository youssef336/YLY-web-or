import type { LocalMemberRepository } from '@/application/ports/member-repository.port';

export class RemoveMeetingUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(entryId: string): Promise<void> {
    await this.repository.removeMeeting(entryId);
  }
}