import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { HrTaskScore, HrQualityScore } from '@/domain/entities/hr-task';

export class UpdateHrTaskUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(
    taskId: string,
    input: { t: HrTaskScore; q: HrQualityScore; d: HrTaskScore },
  ): Promise<void> {
    await this.repository.updateHrTask(taskId, input);
  }
}
