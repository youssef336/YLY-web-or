import type { LocalMemberRepository } from '@/application/ports/member-repository.port';
import { calculateScoreSummary } from '@/domain/score/scoring';
import type { Member } from '@/domain/entities/member';
import type { FieldVisit, FieldVisitScore } from '@/domain/entities/field-visit';
import type { Meeting, MeetingScore } from '@/domain/entities/meeting';
import type { CategoryScores } from '@/domain/entities/category-scores';
import type { MemberProfile } from '@/domain/entities/member-profile';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import type { HrTask, HrTaskScore, HrQualityScore } from '@/domain/entities/hr-task';
import { getDb } from './idb-database';

const MAX_FIELD_VISITS = 15;
const MAX_MEETINGS = 15;

/**
 * IndexedDB adapter for the LocalMemberRepository port (browser / PWA).
 * All operations are async and persist to the device's private database.
 *
 * Field Visits and Meetings reference global events by ID. The repository owns
 * slot assignment: an entry reuses the slot of another entry with the same
 * globalEventId; otherwise it allocates the lowest free slot.
 */
export class IdbLocalRepository implements LocalMemberRepository {
  async createMember(member: Member): Promise<Member> {
    const db = await getDb();
    await db.put('members', member);
    return member;
  }

  async findById(id: string): Promise<Member | null> {
    const db = await getDb();
    return (await db.get('members', id)) ?? null;
  }

  async findAll(): Promise<Member[]> {
    const db = await getDb();
    const members = await db.getAll('members');
    return members.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateMemberName(id: string, name: string): Promise<Member> {
    const db = await getDb();
    const member = await db.get('members', id);
    if (!member) throw new Error('Member not found');
    const updated: Member = { ...member, name };
    await db.put('members', updated);
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['members', 'categoryScores', 'fieldVisits', 'meetings', 'hrTasks'], 'readwrite');
    tx.objectStore('members').delete(id);
    tx.objectStore('categoryScores').delete(id);

    const deleteByMember = async (store: 'fieldVisits' | 'meetings' | 'hrTasks') => {
      const keys = await tx.objectStore(store).index('by-member').getAllKeys(id);
      await Promise.all(keys.map((key) => tx.objectStore(store).delete(key)));
    };

    await Promise.all([deleteByMember('fieldVisits'), deleteByMember('meetings'), deleteByMember('hrTasks')]);
    await tx.done;
  }

  async getCategoryScores(memberId: string): Promise<CategoryScores | null> {
    const db = await getDb();
    return (await db.get('categoryScores', memberId)) ?? null;
  }

  async upsertCategoryScores(
    memberId: string,
    input: { interaction: number; respectHierarchy: number; bonus: number },
  ): Promise<CategoryScores> {
    const db = await getDb();
    const scores: CategoryScores = { memberId, ...input, updatedAt: new Date() };
    await db.put('categoryScores', scores);
    return scores;
  }

  // ── Global events ──────────────────────────────────────────────────

  async listGlobalFieldVisits(): Promise<GlobalFieldVisit[]> {
    const db = await getDb();
    return db.getAll('globalFieldVisits');
  }

  async createGlobalFieldVisit(input: GlobalFieldVisit): Promise<GlobalFieldVisit> {
    const db = await getDb();
    await db.put('globalFieldVisits', input);
    return input;
  }

  async deleteGlobalFieldVisit(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['globalFieldVisits', 'fieldVisits'], 'readwrite');
    tx.objectStore('globalFieldVisits').delete(id);
    const allVisits = await tx.objectStore('fieldVisits').getAll();
    for (const v of allVisits) {
      if (v.globalEventId === id) await tx.objectStore('fieldVisits').delete(v.id);
    }
    await tx.done;
  }

  async listGlobalMeetings(): Promise<GlobalMeeting[]> {
    const db = await getDb();
    return db.getAll('globalMeetings');
  }

  async createGlobalMeeting(input: GlobalMeeting): Promise<GlobalMeeting> {
    const db = await getDb();
    await db.put('globalMeetings', input);
    return input;
  }

  async deleteGlobalMeeting(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['globalMeetings', 'meetings'], 'readwrite');
    tx.objectStore('globalMeetings').delete(id);
    const allMeetings = await tx.objectStore('meetings').getAll();
    for (const m of allMeetings) {
      if (m.globalEventId === id) await tx.objectStore('meetings').delete(m.id);
    }
    await tx.done;
  }

  // ── Member entries (reference global events) ────────────────────────

  async addFieldVisit(input: {
    memberId: string;
    id: string;
    globalEventId: string;
    score: FieldVisitScore;
  }): Promise<FieldVisit> {
    const db = await getDb();
    const slot = await this.resolveSlot('fieldVisits', null, input.globalEventId, MAX_FIELD_VISITS);
    const visit: FieldVisit = { ...input, slot, createdAt: new Date() };
    await db.put('fieldVisits', visit);
    return visit;
  }

  async updateFieldVisit(id: string, input: { score: FieldVisitScore }): Promise<FieldVisit> {
    const db = await getDb();
    const existing = await db.get('fieldVisits', id);
    if (!existing) throw new Error('Field visit not found');
    const updated: FieldVisit = { ...existing, ...input };
    await db.put('fieldVisits', updated);
    return updated;
  }

  async removeFieldVisit(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('fieldVisits', id);
  }

  async addMeeting(input: { memberId: string; id: string; globalEventId: string; score: MeetingScore }): Promise<Meeting> {
    const db = await getDb();
    const slot = await this.resolveSlot('meetings', null, input.globalEventId, MAX_MEETINGS);
    const meeting: Meeting = { ...input, slot, createdAt: new Date() };
    await db.put('meetings', meeting);
    return meeting;
  }

  async updateMeeting(id: string, input: { score: MeetingScore }): Promise<Meeting> {
    const db = await getDb();
    const existing = await db.get('meetings', id);
    if (!existing) throw new Error('Meeting not found');
    const updated: Meeting = { ...existing, ...input };
    await db.put('meetings', updated);
    return updated;
  }

  async removeMeeting(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('meetings', id);
  }

  // ── HR Tasks ────────────────────────────────────────────────────────

  async listHrTasks(memberId: string): Promise<HrTask[]> {
    const db = await getDb();
    return db.getAllFromIndex('hrTasks', 'by-member', memberId);
  }

  async addHrTask(input: {
    memberId: string;
    id: string;
    taskIndex: number;
    name: string;
    date: string;
    t: HrTaskScore;
    q: HrQualityScore;
    d: HrTaskScore;
  }): Promise<HrTask> {
    const db = await getDb();
    const now = new Date();
    const task: HrTask = { ...input, createdAt: now, updatedAt: now };
    await db.put('hrTasks', task);
    return task;
  }

  async updateHrTask(
    id: string,
    input: { t: HrTaskScore; q: HrQualityScore; d: HrTaskScore },
  ): Promise<HrTask> {
    const db = await getDb();
    const existing = await db.get('hrTasks', id);
    if (!existing) throw new Error('HR task not found');
    const updated: HrTask = { ...existing, ...input, updatedAt: new Date() };
    await db.put('hrTasks', updated);
    return updated;
  }

  async removeHrTask(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('hrTasks', id);
  }

  async loadProfile(memberId: string): Promise<MemberProfile | null> {
    const db = await getDb();
    const member = await db.get('members', memberId);
    if (!member) return null;

    const [scores, fieldVisits, meetings, hrTasks] = await Promise.all([
      db.get('categoryScores', memberId),
      db.getAllFromIndex('fieldVisits', 'by-member', memberId),
      db.getAllFromIndex('meetings', 'by-member', memberId),
      db.getAllFromIndex('hrTasks', 'by-member', memberId),
    ]);

    const summary = calculateScoreSummary({
      tasks: hrTasks,
      fieldVisits,
      meetings,
      interaction: scores?.interaction ?? 0,
      respectHierarchy: scores?.respectHierarchy ?? 0,
      bonus: scores?.bonus ?? 0,
    });

    return { member, fieldVisits, meetings, scores: scores ?? null, hrTasks, summary };
  }

  /**
   * Assigns a template column (slot 0-14) for a field visit / meeting entry.
   * Reuses the slot of an existing entry with the same globalEventId (so one
   * global event = one column shared by every member), otherwise allocates the
   * lowest free slot. Throws once all slots are taken.
   */
  private async resolveSlot(
    store: 'fieldVisits' | 'meetings',
    excludeId: string | null,
    globalEventId: string,
    maxSlots: number,
  ): Promise<number> {
    const db = await getDb();
    const all = await db.getAll(store);
    const others = excludeId ? all.filter((e) => e.id !== excludeId) : all;

    const sameEvent = others.find((e) => e.globalEventId === globalEventId);
    if (sameEvent) return sameEvent.slot;

    const used = new Set(others.map((e) => e.slot));
    for (let slot = 0; slot < maxSlots; slot++) {
      if (!used.has(slot)) return slot;
    }
    const noun = store === 'fieldVisits' ? 'field visits' : 'meetings';
    throw new Error(`Maximum ${maxSlots} ${noun} reached`);
  }
}
