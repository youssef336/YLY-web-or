import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import type { ExcelGenerator } from '@/application/ports/excel-generator.port';
import type { MemberProfile } from '@/domain/entities/member-profile';

/**
 * Compiles ALL members' evaluation data into the ORMEMBER (OER) Excel template
 * (one member per registry row, ranked by total score descending).
 *
 * Fetches global events so the injector can write header labels (row 3)
 * from the global event names/dates. Only data-entry cells are written;
 * formula columns are never touched.
 */
export class ExportEvaluationToExcelUseCase {
  constructor(
    private readonly repository: LocalMemberRepository,
    private readonly excel: ExcelGenerator,
  ) {}

  async execute(): Promise<Uint8Array> {
    const members = await this.repository.findAll();

    const profiles = await Promise.all(
      members.map(async (member): Promise<MemberProfile> => {
        const profile = await this.repository.loadProfile(member.id);
        if (!profile) throw new Error(`Missing profile for member ${member.id}`);
        return profile;
      }),
    );

    const [globalFieldVisits, globalMeetings] = await Promise.all([
      this.repository.listGlobalFieldVisits(),
      this.repository.listGlobalMeetings(),
    ]);

    return this.excel.generateAll({ profiles, globalFieldVisits, globalMeetings });
  }
}
