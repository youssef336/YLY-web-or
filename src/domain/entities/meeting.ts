export type MeetingScore = 0 | 0.5 | 1;

/**
 * A member's meeting entry — references a GlobalMeeting by ID.
 *
 * Each of the 15 "MEETINGS" columns (U..AI) in the SMMEMBER template is a
 * shared event column: the header label lives in row 3 and every member's 0/1
 * score sits in their row under that column. The `slot` (0-14) is assigned by
 * `globalEventId`: all members referencing the same global event share the same
 * slot.
 */
export interface Meeting {
  id: string;
  memberId: string;
  /** References GlobalMeeting.id — determines the column slot and header label. */
  globalEventId: string;
  /** 1 = attended, 0.5 = excused, 0 = absent. */
  score: MeetingScore;
  /** Assigned template column index (0-14 -> U..AI). */
  slot: number;
  createdAt: Date;
}