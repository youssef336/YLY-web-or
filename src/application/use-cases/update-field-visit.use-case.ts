import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { FieldVisitInput } from '@/application/dto/member.dto';
import { FieldVisitInputSchema } from '@/application/dto/member.dto';
import { MemberNotFoundError } from './errors';
import { parseOrThrow } from './validation';

export class UpdateFieldVisitUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string, entryId: string, input: FieldVisitInput): Promise<void> {
    const data = parseOrThrow(FieldVisitInputSchema, input);
    const member = await this.repository.findById(memberId);
    if (!member) throw new MemberNotFoundError(memberId);
    await this.repository.updateFieldVisit(entryId, { score: data.score });
  }
}