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

    // ── Write member data rows (Row 4+) using HARDCODED OER column indices ──
    sorted.forEach((profile, index) => {
      const row = sheet.getRow(HR_TEMPLATE.firstDataRow + index);

      // Name (column A = 1)
      row.getCell(OER_COL.NAME).value = profile.member.name;

      // ── Field Visit scores → columns C..Q (3..17) ──
      for (const visit of profile.fieldVisits) {
        if (visit.slot < 0 || visit.slot >= MAX_FIELD_VISITS) continue;
        row.getCell(OER_COL.FV_START + visit.slot).value = visit.score;
      }

      // ── Meeting scores → columns T..AH (20..34) ──
      for (const meeting of profile.meetings) {
        if (meeting.slot < 0 || meeting.slot >= MAX_MEETINGS) continue;
        row.getCell(OER_COL.M_START + meeting.slot).value = meeting.score;
      }

      // ── HR Tasks → columns AK..CT (37..66), 3 columns per task ──
      for (const task of profile.hrTasks) {
        if (task.taskIndex < 0 || task.taskIndex >= MAX_HR_TASKS) continue;
        const base = OER_COL.T_START + task.taskIndex * 3;
        row.getCell(base).value = task.t;       // T metric
        row.getCell(base + 1).value = task.q;   // Q metric
        row.getCell(base + 2).value = task.d;   // D metric
      }

      // ── Category scores → CU(67), CV(68), CW(69) ──
      row.getCell(OER_COL.INTERACTION).value = profile.scores?.interaction ?? 0;
      row.getCell(OER_COL.RESPECT_HIERARCHY).value = profile.scores?.respectHierarchy ?? 0;
      row.getCell(OER_COL.BONUS).value = profile.scores?.bonus ?? 0;
    });

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
