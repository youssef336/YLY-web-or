import ExcelJS from 'exceljs';
import {
  HR_TEMPLATE,
  MAX_FIELD_VISITS,
  MAX_MEETINGS,
  MAX_REGISTRY_ROWS,
  MAX_HR_TASKS,
  OER_COL,
} from './hr-committee-layout';

const { headerRow, firstDataRow, lastDataRow } = HR_TEMPLATE;

function writeCalculatedFormulas(rowNumber: number, row: ExcelJS.Row, sheet: ExcelJS.Worksheet): void {
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
    setFormulaCell(row, sheet, columnLetter, rowNumber, formula);
  }
}

function setFormulaCell(
  row: ExcelJS.Row,
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

export interface OfficialEvent {
  name?: string;
  date: string;
  shift?: 'Day' | 'Night';
}

export interface OfficialTask {
  name: string;
  date: string;
}

function cellToNumber(value: ExcelJS.CellValue): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === 'object' && 'result' in value) {
    const r = (value as { result?: unknown }).result;
    return typeof r === 'number' ? r : 0;
  }
  return 0;
}

function cellToString(value: ExcelJS.CellValue): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && 'result' in value) {
    const r = (value as { result?: unknown }).result;
    return r != null ? String(r) : null;
  }
  return null;
}

/**
 * Extract the date+shift key from a header label.
 * Visit headers are "Name - YYYY-MM-DD (Day)" → "YYYY-MM-DD (Day)"
 * Meeting headers are "Name - YYYY-MM-DD" → "YYYY-MM-DD"
 */
function extractDateKeyFromHeader(header: string | null): string | null {
  if (!header) return null;
  const dashIndex = header.lastIndexOf(' - ');
  const tail = dashIndex >= 0 ? header.substring(dashIndex + 3).trim() : header.trim();
  const match = tail.match(/^(\d{4}-\d{2}-\d{2})(?:\s*\((Day|Night)\))?$/);
  if (!match) return null;
  const date = match[1];
  const shift = match[2];
  return shift ? `${date} (${shift})` : date;
}

/**
 * Extract the date key from a task header label.
 * Task headers are "TaskName - YYYY-MM-DD" → "YYYY-MM-DD"
 */
function extractTaskDateKey(header: string | null): string | null {
  if (!header) return null;
  const dashIndex = header.lastIndexOf(' - ');
  if (dashIndex < 0) return null;
  const tail = header.substring(dashIndex + 3).trim();
  const match = tail.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Read Row 3 of a workbook and return slot→date maps for visits, meetings,
 * and tasks. Uses HARDCODED OER column indices to read from the correct positions.
 */
function readSourceHeaders(workbook: ExcelJS.Workbook): {
  visits: Map<number, string>;
  meetings: Map<number, string>;
  tasks: Map<number, string>;
} {
  const sheet = workbook.getWorksheet(HR_TEMPLATE.sheetName);
  const visits = new Map<number, string>();
  const meetings = new Map<number, string>();
  const tasks = new Map<number, string>();
  if (!sheet) return { visits, meetings, tasks };

  const row = sheet.getRow(headerRow);

  // Read task date headers from AK3, AN3, ... (T columns at OER_COL.T_START + i*3)
  for (let i = 0; i < MAX_HR_TASKS; i++) {
    const header = cellToString(row.getCell(OER_COL.T_START + i * 3).value);
    const dateKey = extractTaskDateKey(header);
    if (dateKey) tasks.set(i, dateKey);
  }

  // Read meeting date headers from T3..AH3
  for (let i = 0; i < MAX_MEETINGS; i++) {
    const key = extractDateKeyFromHeader(cellToString(row.getCell(OER_COL.M_START + i).value));
    if (key) meetings.set(i, key);
  }

  // Read field visit date headers from C3..Q3
  for (let i = 0; i < MAX_FIELD_VISITS; i++) {
    const key = extractDateKeyFromHeader(cellToString(row.getCell(OER_COL.FV_START + i).value));
    if (key) visits.set(i, key);
  }

  return { visits, meetings, tasks };
}

/**
 * Read all member data rows from a workbook using HARDCODED OER column indices.
 */
function extractRawRows(workbook: ExcelJS.Workbook): {
  name: string;
  tasks: Array<{ t: number; q: number; d: number }>;
  visits: (number | null)[];
  meetings: (number | null)[];
  interaction: number;
  respectHierarchy: number;
  bonus: number;
}[] {
  const sheet = workbook.getWorksheet(HR_TEMPLATE.sheetName);
  if (!sheet) return [];

  const rows: {
    name: string;
    tasks: Array<{ t: number; q: number; d: number }>;
    visits: (number | null)[];
    meetings: (number | null)[];
    interaction: number;
    respectHierarchy: number;
    bonus: number;
  }[] = [];

  for (let r = firstDataRow; r <= lastDataRow; r++) {
    const row = sheet.getRow(r);
    const name = cellToString(row.getCell(OER_COL.NAME).value);
    if (!name) break;

    // Read tasks from AK..CT (OER_COL.T_START + i*3)
    const tasks: Array<{ t: number; q: number; d: number }> = [];
    for (let i = 0; i < MAX_HR_TASKS; i++) {
      const base = OER_COL.T_START + i * 3;
      const t = cellToNumber(row.getCell(base).value);
      const q = cellToNumber(row.getCell(base + 1).value);
      const d = cellToNumber(row.getCell(base + 2).value);
      tasks.push({ t, q, d });
    }

    // Read field visit scores from C..Q (OER_COL.FV_START + i)
    const visits: (number | null)[] = [];
    for (let i = 0; i < MAX_FIELD_VISITS; i++) {
      const v = row.getCell(OER_COL.FV_START + i).value;
      visits.push(v != null ? cellToNumber(v) : null);
    }

    // Read meeting scores from T..AH (OER_COL.M_START + i)
    const meetings: (number | null)[] = [];
    for (let i = 0; i < MAX_MEETINGS; i++) {
      const v = row.getCell(OER_COL.M_START + i).value;
      meetings.push(v != null ? cellToNumber(v) : null);
    }

    rows.push({
      name,
      tasks,
      visits,
      meetings,
      interaction: cellToNumber(row.getCell(OER_COL.INTERACTION).value),
      respectHierarchy: cellToNumber(row.getCell(OER_COL.RESPECT_HIERARCHY).value),
      bonus: cellToNumber(row.getCell(OER_COL.BONUS).value),
    });
  }

  return rows;
}

/**
 * Merge multiple uploaded ORMEMBER (OER) .xlsx files into a single master template.
 *
 * The leader defines "official" events (field visits + meetings) and tasks
 * which become the master Row 3 headers. Uploaded files are mapped to the
 * master via DATE matching for all categories (tasks, visits, meetings).
 *
 * Monthly targets are written to "Entered" count columns for all rows.
 *
 * OER column layout:
 *   A = Name
 *   B = Field Visits Entered, C..Q = Field Visits (15 cols)
 *   S = Meetings Entered, T..AH = Meetings (15 cols)
 *   AJ = Tasks Entered, AK..CT = Tasks (10×3 cols)
 *   CU = Interaction, CV = Respect Hierarchy, CW = Bonus
 */
export async function mergeExcelFiles(
  files: File[],
  officialVisits: OfficialEvent[],
  officialMeetings: OfficialEvent[],
  officialTasks?: OfficialTask[],
  targets?: { tasks: number; meetings: number; fieldVisits: number },
): Promise<Uint8Array> {
  // 1. Load pristine master ORMEMBER template
  const masterUrl = `${new URL(HR_TEMPLATE.filePath, window.location.origin).href}?v=${Date.now()}`;
  const masterRes = await fetch(masterUrl, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
  if (!masterRes.ok) throw new Error(`Master template not found (HTTP ${masterRes.status})`);

  const masterWb = new ExcelJS.Workbook();
  await masterWb.xlsx.load(await masterRes.arrayBuffer());
  const masterSheet = masterWb.getWorksheet(HR_TEMPLATE.sheetName);
  if (!masterSheet) throw new Error(`Sheet "${HR_TEMPLATE.sheetName}" not found in template`);

  // 2. Write official headers to Row 3 of the master using HARDCODED OER columns
  const masterHeaderRow = masterSheet.getRow(headerRow);
  const masterVisitKeyToSlot = new Map<string, number>();
  const masterMeetingKeyToSlot = new Map<string, number>();
  const masterTaskDateToSlot = new Map<string, number>();

  // Write official task headers: "TaskName - YYYY-MM-DD" in AK3, AN3, ...
  if (officialTasks) {
    for (let i = 0; i < officialTasks.length && i < MAX_HR_TASKS; i++) {
      const task = officialTasks[i];
      if (task.name) {
        const label = task.date ? `${task.name} - ${task.date}` : task.name;
        masterHeaderRow.getCell(OER_COL.T_START + i * 3).value = label;
        if (task.date) masterTaskDateToSlot.set(task.date, i);
      }
    }
  }

  // Write official field visit headers to Row 3, columns C..Q
  for (let i = 0; i < officialVisits.length && i < MAX_FIELD_VISITS; i++) {
    const ev = officialVisits[i];
    const shift = ev.shift ?? 'Day';
    const label = ev.name ? `${ev.name} - ${ev.date} (${shift})` : `${ev.date} (${shift})`;
    masterHeaderRow.getCell(OER_COL.FV_START + i).value = label;
    masterVisitKeyToSlot.set(`${ev.date} (${shift})`, i);
  }

  // Write official meeting headers to Row 3, columns T..AH
  for (let i = 0; i < officialMeetings.length && i < MAX_MEETINGS; i++) {
    const ev = officialMeetings[i];
    const name = ev.name ?? 'Meeting';
    const label = `${name} - ${ev.date}`;
    masterHeaderRow.getCell(OER_COL.M_START + i).value = label;
    masterMeetingKeyToSlot.set(ev.date, i);
  }

  // 3. Process uploaded files — date-based mapping for ALL categories
  const allRemappedRows: {
    name: string;
    tasks: Array<{ t: number; q: number; d: number }>;
    visits: (number | null)[];
    meetings: (number | null)[];
    interaction: number;
    respectHierarchy: number;
    bonus: number;
  }[] = [];

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const sourceHeaders = readSourceHeaders(wb);
    const sourceRows = extractRawRows(wb);

    for (const src of sourceRows) {
      // Remap task scores: source slot → source date → master slot
      const remappedTasks: Array<{ t: number; q: number; d: number }> = Array.from(
        { length: MAX_HR_TASKS },
        () => ({ t: 0, q: 0, d: 0 }),
      );
      for (const [srcSlot, dateKey] of sourceHeaders.tasks) {
        const masterSlot = masterTaskDateToSlot.get(dateKey);
        if (masterSlot != null && src.tasks[srcSlot]) {
          remappedTasks[masterSlot] = src.tasks[srcSlot];
        }
      }

      // Remap visit scores: source slot → source date+key → master slot
      const remappedVisits: (number | null)[] = Array(MAX_FIELD_VISITS).fill(null);
      for (const [srcSlot, key] of sourceHeaders.visits) {
        const masterSlot = masterVisitKeyToSlot.get(key);
        if (masterSlot != null && src.visits[srcSlot] != null) {
          remappedVisits[masterSlot] = src.visits[srcSlot];
        }
      }

      // Remap meeting scores: source slot → source date → master slot
      const remappedMeetings: (number | null)[] = Array(MAX_MEETINGS).fill(null);
      for (const [srcSlot, key] of sourceHeaders.meetings) {
        const masterSlot = masterMeetingKeyToSlot.get(key);
        if (masterSlot != null && src.meetings[srcSlot] != null) {
          remappedMeetings[masterSlot] = src.meetings[srcSlot];
        }
      }

      allRemappedRows.push({
        name: src.name,
        tasks: remappedTasks,
        visits: remappedVisits,
        meetings: remappedMeetings,
        interaction: src.interaction,
        respectHierarchy: src.respectHierarchy,
        bonus: src.bonus,
      });
    }
  }

  if (allRemappedRows.length === 0) {
    throw new Error('No member data found in the uploaded files.');
  }

  if (allRemappedRows.length > MAX_REGISTRY_ROWS) {
    throw new Error(
      `Too many members (${allRemappedRows.length}). The template supports ${MAX_REGISTRY_ROWS} rows maximum.`,
    );
  }

  // 4. Write remapped rows to the full master template range. Each registry row
  // remains a live pre-filled template with formula cells, even when no member data
  // occupies that slot yet.
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber++) {
    const row = masterSheet.getRow(rowNumber);
    writeCalculatedFormulas(rowNumber, row, masterSheet);

    const data = allRemappedRows[rowNumber - firstDataRow];
    if (!data) continue;

    // Name (column A = 1)
    row.getCell(OER_COL.NAME).value = data.name;

    // ── Field Visit scores → columns C..Q (3..17) ──
    for (let i = 0; i < MAX_FIELD_VISITS; i++) {
      row.getCell(OER_COL.FV_START + i).value = data.visits[i] ?? null;
    }

    // ── Meeting scores → columns T..AH (20..34) ──
    for (let i = 0; i < MAX_MEETINGS; i++) {
      row.getCell(OER_COL.M_START + i).value = data.meetings[i] ?? null;
    }

    // ── HR Tasks → columns AK..CT (37..66), 3 columns per task ──
    for (let i = 0; i < MAX_HR_TASKS; i++) {
      const task = data.tasks[i];
      const base = OER_COL.T_START + i * 3;
      if (task && (task.t !== 0 || task.q !== 0 || task.d !== 0)) {
        row.getCell(base).value = task.t || null;
        row.getCell(base + 1).value = task.q || null;
        row.getCell(base + 2).value = task.d || null;
      } else {
        row.getCell(base).value = null;
        row.getCell(base + 1).value = null;
        row.getCell(base + 2).value = null;
      }
    }

    // ── Category scores → CU(67), CV(68), CW(69) ──
    row.getCell(OER_COL.INTERACTION).value = data.interaction;
    row.getCell(OER_COL.RESPECT_HIERARCHY).value = data.respectHierarchy;
    row.getCell(OER_COL.BONUS).value = data.bonus;

    // 5. Overwrite "Entered" count columns with target numbers
    if (targets) {
      row.getCell(OER_COL.FV_COUNT).value = targets.fieldVisits;
      row.getCell(OER_COL.M_COUNT).value = targets.meetings;
      row.getCell(OER_COL.T_COUNT).value = targets.tasks;
    }
  }

  // 6. Strip cached formula results so Excel recalculates on open
  masterSheet.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell && typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value) {
        delete (cell.value as unknown as Record<string, unknown>).result;
      }
    });
  });

  const buffer = await masterWb.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
