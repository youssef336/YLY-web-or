import type { LocalMemberRepository } from '@/application/ports/member-repository.port';

export class DeleteGlobalFieldVisitUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(id: string): Promise<void> {
    await this.repository.deleteGlobalFieldVisit(id);
  }
}