import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { GlobalFieldVisitInput } from '@/application/dto/member.dto';
import { GlobalFieldVisitInputSchema } from '@/application/dto/member.dto';
import { parseOrThrow, newId } from './validation';

export class CreateGlobalFieldVisitUseCase {
  constructor(private readonly repository: LocalMemberRepository) {}

  async execute(input: GlobalFieldVisitInput): Promise<void> {
    const data = parseOrThrow(GlobalFieldVisitInputSchema, input);
    await this.repository.createGlobalFieldVisit({
      id: newId(),
      name: data.name,
      date: data.date,
      shift: data.shift,
      createdAt: new Date(),
    });
  }
}