export type FieldVisitShift = 'Day' | 'Night';

/**
 * A global field visit event — independent of any specific member.
 * Created on the Home page; members then reference it by ID when scoring.
 */
export interface GlobalFieldVisit {
  id: string;
  /** Location / event name shown in the Excel header cell. */
  name: string;
  /** Event date (ISO YYYY-MM-DD). */
  date: string;
  /** Shift: Day or Night. Allows two visits on the same date. */
  shift: FieldVisitShift;
  createdAt: Date;
}

/** Label injected into the column header cell (row 3) for a field visit. */
export function fieldVisitHeaderLabel(visit: { name: string; date: string; shift: FieldVisitShift }): string {
  return `${visit.name.trim()} - ${visit.date.trim()} (${visit.shift})`;
}

/** Composite key for date-based merge matching: "YYYY-MM-DD (Shift)" */
export function fieldVisitDateKey(visit: { date: string; shift: FieldVisitShift }): string {
  return `${visit.date.trim()} (${visit.shift})`;
}
