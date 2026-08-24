import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import { MemberNotFoundError } from './errors';

export class DeleteMemberUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(memberId: string): Promise<void> {
    const existing = await this.repository.findById(memberId);
    if (!existing) throw new MemberNotFoundError(memberId);
    await this.repository.deleteMember(memberId);
  }
}