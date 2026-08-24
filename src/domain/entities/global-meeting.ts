/**
 * A global meeting event — independent of any specific member.
 * Created on the Home page; members then reference it by ID when scoring.
 */
export interface GlobalMeeting {
  id: string;
  /** Meeting name (e.g. "Weekly Sync"). */
  name: string;
  /** Meeting date (ISO YYYY-MM-DD). */
  date: string;
  createdAt: Date;
}

/** Label injected into the column header cell (row 3) for a meeting. */
export function meetingHeaderLabel(meeting: { name: string; date: string }): string {
  return `${meeting.name.trim()} - ${meeting.date.trim()}`;
}

/** Composite key for date-based merge matching: "Name - YYYY-MM-DD" */
export function meetingDateKey(meeting: { name: string; date: string }): string {
  return `${meeting.name.trim()} - ${meeting.date.trim()}`;
}