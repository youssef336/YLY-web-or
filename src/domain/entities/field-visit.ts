export type FieldVisitScore = 0 | 0.5 | 1;

/**
 * A member's field visit entry — references a GlobalFieldVisit by ID.
 *
 * Each of the 15 "FIELD VISITS" columns (D..R) in the SMMEMBER template is a
 * shared event column: the header label lives in row 3 and every member's 0/1
 * score sits in their row under that column. The `slot` (0-14) is assigned by
 * `globalEventId`: all members referencing the same global event share the same
 * slot, keeping headers and scores aligned.
 */
export interface FieldVisit {
  id: string;
  memberId: string;
  /** References GlobalFieldVisit.id — determines the column slot and header label. */
  globalEventId: string;
  /** 1 = complete, 0.5 = excused/partial, 0 = incomplete. */
  score: FieldVisitScore;
  /** Assigned template column index (0-14 -> D..R). */
  slot: number;
  createdAt: Date;
}