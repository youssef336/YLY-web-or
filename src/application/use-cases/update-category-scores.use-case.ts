import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { CategoryScoresInput } from '@/application/dto/member.dto';
import { CategoryScoresInputSchema } from '@/application/dto/member.dto';
import { MemberNotFoundError } from './errors';
import { parseOrThrow } from './validation';

export class UpdateCategoryScoresUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string, input: CategoryScoresInput): Promise<void> {
    const data = parseOrThrow(CategoryScoresInputSchema, input);
    const member = await this.repository.findById(memberId);
    if (!member) throw new MemberNotFoundError(memberId);
    await this.repository.upsertCategoryScores(memberId, data);
  }
}