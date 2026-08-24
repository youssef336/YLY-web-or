import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { HrTaskScore, HrQualityScore } from '@/domain/entities/hr-task';
import { newId } from './validation';

export class AddHrTaskUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(
    memberId: string,
    input: {
      name: string;
      taskIndex: number;
      date: string;
      t: HrTaskScore;
      q: HrQualityScore;
      d: HrTaskScore;
    },
  ): Promise<void> {
    const id = newId();
    await this.repository.addHrTask({ memberId, id, ...input });
  }
}
