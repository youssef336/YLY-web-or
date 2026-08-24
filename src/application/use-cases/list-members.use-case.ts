import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { Member } from '@/domain/entities/member';

export class ListMembersUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(): Promise<Member[]> {
    return this.repository.findAll();
  }
}