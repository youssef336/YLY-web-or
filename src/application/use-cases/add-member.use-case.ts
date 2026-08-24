import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { AddMemberInput } from '@/application/dto/member.dto';
import type { MemberProfile } from '@/domain/entities/member-profile';
import { AddMemberInputSchema } from '@/application/dto/member.dto';
import { newId, parseOrThrow } from './validation';

export class AddMemberUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(input: AddMemberInput): Promise<MemberProfile> {
    const { name } = parseOrThrow(AddMemberInputSchema, input);

    const member = await this.repository.createMember({
      id: newId(),
      name,
      createdAt: new Date(),
    });

    const profile = await this.repository.loadProfile(member.id);
    if (!profile) throw new Error('Failed to create member');
    return profile;
  }
}