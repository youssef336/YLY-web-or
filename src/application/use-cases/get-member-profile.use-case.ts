import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { MemberProfile } from '@/domain/entities/member-profile';
import { MemberNotFoundError } from './errors';

export class GetMemberProfileUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string): Promise<MemberProfile> {
    const profile = await this.repository.loadProfile(memberId);
    if (!profile) throw new MemberNotFoundError(memberId);
    return profile;
  }
}