import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { FieldVisitInput } from '@/application/dto/member.dto';
import { FieldVisitInputSchema } from '@/application/dto/member.dto';
import { MemberNotFoundError } from './errors';
import { newId, parseOrThrow } from './validation';

export class AddFieldVisitUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string, input: FieldVisitInput): Promise<void> {
    const data = parseOrThrow(FieldVisitInputSchema, input);
    const member = await this.repository.findById(memberId);
    if (!member) throw new MemberNotFoundError(memberId);
    await this.repository.addFieldVisit({ memberId, id: newId(), globalEventId: data.globalEventId, score: data.score });
  }
}