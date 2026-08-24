/**
 * ORMEMBER (OER) template column mapping.
 *
 * OER template layout (each row = one member):
 *   A          = Member name
 *   B          = Field Visits Entered (FORMULA — NEVER written)
 *   C..Q (15)  = Field Visit scores (0/1)           /30
 *   S          = Meetings Entered (FORMULA — NEVER written)
 *   T..AH (15) = Meeting scores (0/1)               /30
 *   AJ         = Tasks Entered (FORMULA — NEVER written)
 *   AK..CT (30)= Task columns — 10 tasks × 3 columns (T, Q, D) each  /20
 *     Task 1:  AK (T), AL (Q), AM (D)
 *     Task 2:  AN (T), AO (Q), AP (D)
 *     ...
 *     Task 10: CR (T), CS (Q), CT (D)
 *   CU         = Interaction /10 (direct input)
 *   CV         = Respect Hierarchy /10 (direct input)
 *   CW         = Bonus /10 (direct input)
 *
 * Template layout:
 *   row 2 = dark blue section headers (static text)
 *   row 3 = LIGHT YELLOW header row — visit dates in C3:Q3,
 *            meeting dates in T3:AH3, task names in AK3, AN3, ...
 *   row 4..303 = one member per row (300 registry rows)
 */
export const HR_TEMPLATE = {
  sheetName: 'Member Evaluation',
  filePath: '/exel need/ORMEMBER (1).xlsx',
  downloadFileName: 'ORMEMBER (1).xlsx',
  headerRow: 3,
  firstDataRow: 4,
  lastDataRow: 303,
  columns: {
    name: 'A',
    fieldVisitsCount: 'B',
    fieldVisitsStart: 'C',
    fieldVisitsEnd: 'Q',
    meetingsCount: 'S',
    meetingsStart: 'T',
    meetingsEnd: 'AH',
    tasksCount: 'AJ',
    tasksStart: 'AK',
    tasksEnd: 'CT',
    interaction: 'CU',
    respectHierarchy: 'CV',
    bonus: 'CW',
  },
} as const;

/** Maximum number of HR tasks (30 columns / 3 columns per task). */
export const MAX_HR_TASKS = 10;

/** Maximum field visits and meetings (15 columns each). */
export const MAX_FIELD_VISITS = 15;
export const MAX_MEETINGS = 15;

export const MAX_REGISTRY_ROWS =
  HR_TEMPLATE.lastDataRow - HR_TEMPLATE.firstDataRow + 1;

/**
 * Numeric (1-based) column indices for the OER template.
 * Used by the injector and merger to write data to exact positions,
 * bypassing the dynamic parser to guarantee correct OER mapping.
 */
export const OER_COL = {
  NAME: 1,                      // A
  FV_COUNT: 2,                  // B  (Field Visits Entered — formula)
  FV_START: 3,                  // C  (first field visit column)
  FV_END: 17,                   // Q  (last field visit column = C + 14)
  M_COUNT: 19,                  // S  (Meetings Entered — formula)
  M_START: 20,                  // T  (first meeting column)
  M_END: 34,                    // AH (last meeting column = T + 14)
  T_COUNT: 36,                  // AJ (Tasks Entered — formula)
  T_START: 37,                  // AK (first task T column)
  INTERACTION: 67,              // CU
  RESPECT_HIERARCHY: 68,        // CV
  BONUS: 69,                    // CW
} as const;

/**
 * Get the ExcelJS column index (1-based) for a specific metric of a task.
 * Task 0 → columns AK(37), AL(38), AM(39)
 * Task 1 → columns AN(40), AO(41), AP(42)
 * ...
 */
export function taskColumnIndex(taskIndex: number, metric: 't' | 'q' | 'd'): number {
  const base = columnLetterToIndex(HR_TEMPLATE.columns.tasksStart);
  const offset = taskIndex * 3;
  const metricOffset = metric === 't' ? 0 : metric === 'q' ? 1 : 2;
  return base + offset + metricOffset;
}

export function columnLetterToIndex(letter: string): number {
  let index = 0;
  for (const char of letter.toUpperCase()) {
    index = index * 26 + (char.charCodeAt(0) - 64);
  }
  return index;
}
