import ExcelJS from 'exceljs';
import type { ExcelGenerator } from '@/application/ports/excel-generator.port';
import type { MemberProfile } from '@/domain/entities/member-profile';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import { fieldVisitHeaderLabel } from '@/domain/entities/global-field-visit';
import { meetingHeaderLabel } from '@/domain/entities/global-meeting';
import {
  HR_TEMPLATE,
  MAX_FIELD_VISITS,
  MAX_MEETINGS,
  MAX_HR_TASKS,
  OER_COL,
} from './hr-committee-layout';
import { parseTemplateLayout } from './template-parser';

/**
 * Injects local member data into the REAL ORMEMBER (OER) template using exceljs,
 * entirely in the browser (offline-first — no server involved).
 *
 * Template fidelity rules:
 *   - Loads the ORIGINAL .xlsx from public/exel need/ via workbook.xlsx.load().
 *   - NEVER creates a new workbook or worksheet — modifies the existing one.
 *   - ONLY writes to cells that have actual data to inject.
 *   - NEVER touches formula columns (B, S, AJ, and trailing formula columns).
 *   - Strips cached formula results so Excel recalculates on open.
 *
 * OER template column layout:
 *   A = Member name
 *   B = Field Visits Entered (FORMULA)
 *   C..Q = Field Visit scores (15 cols)
 *   S = Meetings Entered (FORMULA)
 *   T..AH = Meeting scores (15 cols)
 *   AJ = Tasks Entered (FORMULA)
 *   AK..CT = Task scores (10 tasks × 3 cols)
 *   CU = Interaction, CV = Respect Hierarchy, CW = Bonus
 */
export class ExceljsInjector implements ExcelGenerator {
  async generateAll(input: {
    profiles: MemberProfile[];
    globalFieldVisits: GlobalFieldVisit[];
    globalMeetings: GlobalMeeting[];
  }): Promise<Uint8Array> {
    const { profiles, globalFieldVisits, globalMeetings } = input;

    // Fetch the pristine ORMEMBER template
    const cacheBust = new Date().getTime();
    const templateUrl = `${new URL(HR_TEMPLATE.filePath, window.location.origin).href}?v=${cacheBust}`;
    let templateBytes: ArrayBuffer;
    try {
      const res = await fetch(templateUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      if (!res.ok) throw new Error(`template not found (HTTP ${res.status})`);
      templateBytes = await res.arrayBuffer();
    } catch (cause) {
      throw new Error(
        `ORMEMBER template not bundled. Copy "ORMEMBER (1).xlsx" into public/exel need/ and rebuild.`,
        { cause },
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBytes);
    const sheet = workbook.getWorksheet(HR_TEMPLATE.sheetName);
    if (!sheet) throw new Error(`Sheet "${HR_TEMPLATE.sheetName}" not found in template`);

    this.clearCachedFormulaResults(sheet);

    // Dynamically parse the template layout (used for header row only)
    const layout = parseTemplateLayout(sheet);

    // Build slot→label maps for meetings and field visits
    const meetingHeaders = this.buildSlotLabels(profiles, 'meetings', globalMeetings);
    const visitHeaders = this.buildSlotLabels(profiles, 'fieldVisits', globalFieldVisits);

    // Write meeting headers to Row 3, columns T..AH
    this.writeHeaders(sheet, meetingHeaders, OER_COL.M_START, MAX_MEETINGS, layout.columnHeaderRow);
    // Write field visit headers to Row 3, columns C..Q
    this.writeHeaders(sheet, visitHeaders, OER_COL.FV_START, MAX_FIELD_VISITS, layout.columnHeaderRow);

    // Write task name + date headers into the header row (AK3, AN3, ...)
    this.writeTaskHeaders(sheet, profiles);

    // Sort profiles by total descending
    const sorted = [...profiles].sort((a, b) => {
      if (b.summary.total !== a.summary.total) return b.summary.total - a.summary.total;
      return a.member.name.localeCompare(b.member.name);
    });

    // Populate the full template range so the workbook behaves like a pre-filled
    // sheet with working formulas for every registry row, not just the rows that
    // currently have member data.
    for (let rowNumber = HR_TEMPLATE.firstDataRow; rowNumber <= HR_TEMPLATE.lastDataRow; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      this.writeCalculatedFormulas(sheet, rowNumber, row);

      const profile = sorted[rowNumber - HR_TEMPLATE.firstDataRow];
      if (!profile) continue;

      // Name (column A = 1)
      row.getCell(OER_COL.NAME).value = profile.member.name;

      // ── Field Visit scores → columns C..Q (3..17) ──
      // Clear all slots first, then write valid scores
      const visitMap = new Map(profile.fieldVisits.map(v => [v.slot, v.score]));
      for (let i = 0; i < MAX_FIELD_VISITS; i++) {
        const score = visitMap.get(i);
        row.getCell(OER_COL.FV_START + i).value = score ?? null;
      }

      // ── Meeting scores → columns T..AH (20..34) ──
      const meetingMap = new Map(profile.meetings.map(m => [m.slot, m.score]));
      for (let i = 0; i < MAX_MEETINGS; i++) {
        const score = meetingMap.get(i);
        row.getCell(OER_COL.M_START + i).value = score ?? null;
      }

      // ── HR Tasks → columns AK..CT (37..66), 3 columns per task ──
      const taskMap = new Map(profile.hrTasks.map(t => [t.taskIndex, t]));
      for (let i = 0; i < MAX_HR_TASKS; i++) {
        const base = OER_COL.T_START + i * 3;
        const task = taskMap.get(i);
        if (task && task.name) {
          row.getCell(base).value = task.t || null;       // T metric
          row.getCell(base + 1).value = task.q || null;   // Q metric
          row.getCell(base + 2).value = task.d || null;   // D metric
        } else {
          row.getCell(base).value = null;
          row.getCell(base + 1).value = null;
          row.getCell(base + 2).value = null;
        }
      }

      // ── Category scores → CU(67), CV(68), CW(69) ──
      row.getCell(OER_COL.INTERACTION).value = profile.scores?.interaction ?? 0;
      row.getCell(OER_COL.RESPECT_HIERARCHY).value = profile.scores?.respectHierarchy ?? 0;
      row.getCell(OER_COL.BONUS).value = profile.scores?.bonus ?? 0;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer as ArrayBuffer);
  }

  /**
   * Write task name + date headers into the header row (Row 3).
   * For each task cluster: T column = "TaskName - YYYY-MM-DD", Q/D columns empty.
   * Uses the first member that has a task at each index.
   */
  private writeTaskHeaders(
    sheet: ExcelJS.Worksheet,
    profiles: MemberProfile[],
  ): void {
    const row = sheet.getRow(HR_TEMPLATE.headerRow);
    const taskData = new Map<number, { name: string; date: string }>();
    for (const profile of profiles) {
      for (const task of profile.hrTasks) {
        if (!taskData.has(task.taskIndex) && task.name) {
          taskData.set(task.taskIndex, { name: task.name, date: task.date });
        }
      }
    }
    for (let i = 0; i < MAX_HR_TASKS; i++) {
      const data = taskData.get(i);
      if (data) {
        const label = data.date
          ? `${data.name} - ${data.date}`
          : data.name;
        row.getCell(OER_COL.T_START + i * 3).value = label;
      }
    }
  }

  private buildSlotLabels(
    profiles: MemberProfile[],
    kind: 'fieldVisits' | 'meetings',
    globalEvents: GlobalFieldVisit[] | GlobalMeeting[],
  ): Map<number, string> {
    const bySlot = new Map<number, string>();
    const globalMap = new Map(globalEvents.map((e) => [e.id, e]));
    for (const profile of profiles) {
      for (const entry of profile[kind]) {
        const globalEvent = globalMap.get(entry.globalEventId);
        if (!globalEvent) continue;
        const label =
          kind === 'fieldVisits'
            ? fieldVisitHeaderLabel(globalEvent as GlobalFieldVisit)
            : meetingHeaderLabel(globalEvent as GlobalMeeting);
        bySlot.set(entry.slot, label);
      }
    }
    return bySlot;
  }

  private writeHeaders(
    sheet: ExcelJS.Worksheet,
    labelsBySlot: Map<number, string>,
    startCol: number,
    maxSlots: number,
    rowNumber: number,
  ): void {
    const headerRowCells = sheet.getRow(rowNumber);
    for (let slot = 0; slot < maxSlots; slot++) {
      const label = labelsBySlot.get(slot);
      if (!label) continue;
      headerRowCells.getCell(startCol + slot).value = label;
    }
  }

  private writeCalculatedFormulas(
    sheet: ExcelJS.Worksheet,
    rowNumber: number,
    row: ExcelJS.Row,
  ): void {
    const formulas: Array<[string, string]> = [
      ['B', `IF(COUNTA(C${rowNumber}:Q${rowNumber})=0,"",COUNTA(C${rowNumber}:Q${rowNumber}))`],
      ['R', `ROUND(IFERROR(SUM(C${rowNumber}:Q${rowNumber})/B${rowNumber}*30,0),0)`],
      ['S', `IF(COUNTA(T${rowNumber}:AH${rowNumber})=0,"",COUNTA(T${rowNumber}:AH${rowNumber}))`],
      ['AI', `ROUND(IFERROR(SUM(T${rowNumber}:AH${rowNumber})/S${rowNumber}*30,0),0)`],
      ['AJ', `IF(COUNTA(AK${rowNumber},AN${rowNumber},AQ${rowNumber},AT${rowNumber},AW${rowNumber},AZ${rowNumber},BC${rowNumber},BF${rowNumber},BI${rowNumber},BL${rowNumber},BO${rowNumber},BR${rowNumber},BU${rowNumber},BX${rowNumber},CA${rowNumber},CD${rowNumber},CG${rowNumber},CJ${rowNumber},CM${rowNumber},CP${rowNumber})=0,"",COUNTA(AK${rowNumber},AN${rowNumber},AQ${rowNumber},AT${rowNumber},AW${rowNumber},AZ${rowNumber},BC${rowNumber},BF${rowNumber},BI${rowNumber},BL${rowNumber},BO${rowNumber},BR${rowNumber},BU${rowNumber},BX${rowNumber},CA${rowNumber},CD${rowNumber},CG${rowNumber},CJ${rowNumber},CM${rowNumber},CP${rowNumber}))`],
      ['CS', `ROUND(IFERROR(SUM(AK${rowNumber},AN${rowNumber},AQ${rowNumber},AT${rowNumber},AW${rowNumber},AZ${rowNumber},BC${rowNumber},BF${rowNumber},BI${rowNumber},BL${rowNumber},BO${rowNumber},BR${rowNumber},BU${rowNumber},BX${rowNumber},CA${rowNumber},CD${rowNumber},CG${rowNumber},CJ${rowNumber},CM${rowNumber},CP${rowNumber})/AJ${rowNumber}*10,0),0)`],
      ['CT', `ROUND(IFERROR(SUM(AL${rowNumber},AO${rowNumber},AR${rowNumber},AU${rowNumber},AX${rowNumber},BA${rowNumber},BD${rowNumber},BG${rowNumber},BJ${rowNumber},BM${rowNumber},BP${rowNumber},BS${rowNumber},BV${rowNumber},BY${rowNumber},CB${rowNumber},CE${rowNumber},CH${rowNumber},CK${rowNumber},CN${rowNumber},CQ${rowNumber})/AJ${rowNumber}/5*5,0),0)`],
      ['CU', `ROUND(IFERROR(SUM(AM${rowNumber},AP${rowNumber},AS${rowNumber},AV${rowNumber},AY${rowNumber},BB${rowNumber},BE${rowNumber},BH${rowNumber},BK${rowNumber},BN${rowNumber},BQ${rowNumber},BT${rowNumber},BW${rowNumber},BZ${rowNumber},CC${rowNumber},CF${rowNumber},CI${rowNumber},CL${rowNumber},CO${rowNumber},CR${rowNumber})/AJ${rowNumber}*5,0),0)`],
      ['CV', `ROUND(SUM(CS${rowNumber}:CU${rowNumber}),2)`],
      ['CZ', `ROUND(SUM(R${rowNumber},AI${rowNumber},CV${rowNumber},CW${rowNumber},CX${rowNumber},CY${rowNumber}),2)`],
      ['DA', `ROUND(CZ${rowNumber}/110*100,1)`],
      ['DB', `IF(CZ${rowNumber}>=90,"A",IF(CZ${rowNumber}>=80,"B",IF(CZ${rowNumber}>=70,"C",IF(CZ${rowNumber}>=60,"D",IF(CZ${rowNumber}>0,"F"," ")))))`],
      ['DE', `IF(A${rowNumber}="","",DA${rowNumber}-ROW()/100000000)`],
    ];

    for (const [columnLetter, formula] of formulas) {
      this.setFormulaCell(sheet, columnLetter, rowNumber, formula);
    }
  }

  private setFormulaCell(
    sheet: ExcelJS.Worksheet,
    columnLetter: string,
    rowNumber: number,
    formula: string,
  ): void {
    if (!/^[A-Z]+$/i.test(columnLetter)) {
      throw new Error(`Invalid formula column letter "${columnLetter}" for row ${rowNumber}. Use a column letter like "B" or "DE", not a cell reference like "B5".`);
    }
    sheet.getCell(`${columnLetter}${rowNumber}`).value = { formula };
  }

  private clearCachedFormulaResults(sheet: ExcelJS.Worksheet): void {
    sheet.eachRow((row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell && typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
          delete (cell.value as unknown as Record<string, unknown>).result;
        }
      });
    });
  }
}
