import type { LocalMemberRepository } from '@/application/ports/member-repository.port';

export class RemoveHrTaskUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(taskId: string): Promise<void> {
    await this.repository.removeHrTask(taskId);
  }
}
