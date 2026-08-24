import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Member } from '@/domain/entities/member';
import type { FieldVisit } from '@/domain/entities/field-visit';
import type { Meeting } from '@/domain/entities/meeting';
import type { CategoryScores } from '@/domain/entities/category-scores';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import type { HrTask } from '@/domain/entities/hr-task';

/**
 * IndexedDB schema. Every evaluator's device keeps its own private copy of
 * the data (offline-first); no bytes ever leave the browser.
 */
export interface MemberEvalDb extends DBSchema {
  members: {
    key: string;
    value: Member;
  };
  categoryScores: {
    key: string; // memberId (one row per member)
    value: CategoryScores;
  };
  globalFieldVisits: {
    key: string;
    value: GlobalFieldVisit;
  };
  globalMeetings: {
    key: string;
    value: GlobalMeeting;
  };
  fieldVisits: {
    key: string;
    value: FieldVisit;
    indexes: { 'by-member': string };
  };
  meetings: {
    key: string;
    value: Meeting;
    indexes: { 'by-member': string };
  };
  hrTasks: {
    key: string;
    value: HrTask;
    indexes: { 'by-member': string };
  };
}

const DB_NAME = 'member-eval-db';
const DB_VERSION = 7;

let dbPromise: Promise<IDBPDatabase<MemberEvalDb>> | null = null;

/** Opens (once) and caches the database connection. */
export function getDb(): Promise<IDBPDatabase<MemberEvalDb>> {
  if (!dbPromise) {
    dbPromise = openDB<MemberEvalDb>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('members')) {
          db.createObjectStore('members', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categoryScores')) {
          db.createObjectStore('categoryScores', { keyPath: 'memberId' });
        }
        if (!db.objectStoreNames.contains('globalFieldVisits')) {
          db.createObjectStore('globalFieldVisits', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('globalMeetings')) {
          db.createObjectStore('globalMeetings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fieldVisits')) {
          const store = db.createObjectStore('fieldVisits', { keyPath: 'id' });
          store.createIndex('by-member', 'memberId');
        }
        if (!db.objectStoreNames.contains('meetings')) {
          const store = db.createObjectStore('meetings', { keyPath: 'id' });
          store.createIndex('by-member', 'memberId');
        }
        if (!db.objectStoreNames.contains('hrTasks')) {
          const store = db.createObjectStore('hrTasks', { keyPath: 'id' });
          store.createIndex('by-member', 'memberId');
        }

        // Drop deprecated `technical` store if it exists (was removed in v7)
        if (oldVersion < 7 && (Array.from(db.objectStoreNames) as string[]).includes('technical')) {
          db.deleteObjectStore('technical' as 'categoryScores');
        }

        // v1 shipped a `tasks` store that no longer exists; drop it on upgrade.
        if (oldVersion < 2 && (Array.from(db.objectStoreNames) as string[]).includes('tasks')) {
          db.deleteObjectStore('tasks' as 'fieldVisits');
        }

        // v4: add `shift` field to existing globalFieldVisits records.
        if (oldVersion < 4 && db.objectStoreNames.contains('globalFieldVisits')) {
          const store = tx.objectStore('globalFieldVisits');
          store.openCursor().then(function processCursor(cursor) {
            if (!cursor) return;
            const val = { ...cursor.value } as Record<string, unknown>;
            if (!val.shift) {
              val.shift = 'Day';
              cursor.update(val as unknown as GlobalFieldVisit);
            }
            cursor.continue().then(processCursor);
          });
        }
        // v5: add `name` field to existing globalMeetings records.
        if (oldVersion < 5 && db.objectStoreNames.contains('globalMeetings')) {
          const store = tx.objectStore('globalMeetings');
          store.openCursor().then(function processCursor(cursor) {
            if (!cursor) return;
            const val = { ...cursor.value } as Record<string, unknown>;
            if (!val.name) {
              val.name = val.date ?? 'Meeting';
              cursor.update(val as unknown as GlobalMeeting);
            }
            cursor.continue().then(processCursor);
          });
        }
      },
    });
  }
  return dbPromise;
}
