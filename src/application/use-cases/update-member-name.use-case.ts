import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { Member } from '@/domain/entities/member';
import type { UpdateMemberNameInput } from '@/application/dto/member.dto';
import { UpdateMemberNameInputSchema } from '@/application/dto/member.dto';
import { MemberNotFoundError } from './errors';
import { parseOrThrow } from './validation';

export class UpdateMemberNameUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string, input: UpdateMemberNameInput): Promise<Member> {
    const { name } = parseOrThrow(UpdateMemberNameInputSchema, input);
    const member = await this.repository.updateMemberName(memberId, name);
    if (!member) throw new MemberNotFoundError(memberId);
    return member;
  }
}