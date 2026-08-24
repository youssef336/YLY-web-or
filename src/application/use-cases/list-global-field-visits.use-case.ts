import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';

export class ListGlobalFieldVisitsUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(): Promise<GlobalFieldVisit[]> {
    return this.repository.listGlobalFieldVisits();
  }
}