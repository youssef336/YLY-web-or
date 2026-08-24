'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getContainer } from '@/infrastructure/container';
import { downloadWorkbook } from '@/infrastructure/download';
import {
  leaderboardToViews,
  type LeaderboardMemberView,
} from '@/interface-adapters/presenters/leaderboard.presenter';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import { BelloLogo } from '@/components/bello-logo';
import { GradeBadge } from '@/components/grade-badge';

function rankClass(rank: number): string {
  if (rank === 1) return 'bg-amber-400/20 text-amber-300 ring-amber-400/40';
  if (rank === 2) return 'bg-slate-300/15 text-slate-200 ring-slate-300/40';
  if (rank === 3) return 'bg-orange-400/15 text-orange-300 ring-orange-400/40';
  return 'bg-white/5 text-slate-400 ring-white/10';
}

const tableHead =
  'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap';
const inputBase =
  'rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50';

export default function HomePage() {
  const router = useRouter();
  const [members, setMembers] = useState<LeaderboardMemberView[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Global events
  const [globalVisits, setGlobalVisits] = useState<GlobalFieldVisit[]>([]);
  const [globalMeetings, setGlobalMeetings] = useState<GlobalMeeting[]>([]);
  const [visitName, setVisitName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitShift, setVisitShift] = useState<'Day' | 'Night'>('Day');
  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [addingVisit, setAddingVisit] = useState(false);
  const [addingMeeting, setAddingMeeting] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  const load = useCallback(async () => {
    const [entries, gv, gm] = await Promise.all([
      getContainer().calculateLeaderboard.execute(),
      getContainer().listGlobalFieldVisits.execute(),
      getContainer().listGlobalMeetings.execute(),
    ]);
    setMembers(leaderboardToViews(entries));
    setGlobalVisits(gv);
    setGlobalMeetings(gm);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      getContainer().calculateLeaderboard.execute(),
      getContainer().listGlobalFieldVisits.execute(),
      getContainer().listGlobalMeetings.execute(),
    ])
      .then(([entries, gv, gm]) => {
        if (!active) return;
        setMembers(leaderboardToViews(entries));
        setGlobalVisits(gv);
        setGlobalMeetings(gm);
      })
      .catch(() => {
        /* keep current list */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function addMember(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await getContainer().addMember.execute({ name: name.trim() });
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  }

  async function addGlobalVisit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!visitName.trim() || !visitDate) return;
    setAddingVisit(true);
    setError(null);
    try {
      await getContainer().createGlobalFieldVisit.execute({ name: visitName.trim(), date: visitDate, shift: visitShift });
      setVisitName('');
      setVisitDate('');
      setVisitShift('Day');
      const gv = await getContainer().listGlobalFieldVisits.execute();
      setGlobalVisits(gv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add field visit');
    } finally {
      setAddingVisit(false);
    }
  }

  async function addGlobalMeeting(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!meetingName.trim() || !meetingDate) return;
    setAddingMeeting(true);
    setError(null);
    try {
      await getContainer().createGlobalMeeting.execute({ name: meetingName.trim(), date: meetingDate });
      setMeetingName('');
      setMeetingDate('');
      const gm = await getContainer().listGlobalMeetings.execute();
      setGlobalMeetings(gm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meeting');
    } finally {
      setAddingMeeting(false);
    }
  }

  async function deleteGlobalVisit(id: string): Promise<void> {
    try {
      await getContainer().deleteGlobalFieldVisit.execute(id);
      const gv = await getContainer().listGlobalFieldVisits.execute();
      setGlobalVisits(gv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function deleteGlobalMeeting(id: string): Promise<void> {
    try {
      await getContainer().deleteGlobalMeeting.execute(id);
      const gm = await getContainer().listGlobalMeetings.execute();
      setGlobalMeetings(gm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function handleExport(): Promise<void> {
    setExporting(true);
    setError(null);
    try {
      const bytes = await getContainer().exportEvaluationToExcel.execute();
      downloadWorkbook(bytes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Check that the template is bundled.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="animate-bello-in mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BelloLogo size={46} />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Bello</h1>
            <p className="text-sm text-slate-400">OER Member Evaluation &amp; Tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/leader"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            Leader Dashboard
          </Link>
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : 'Export OER Excel'}
          </button>
        </div>
      </header>

      {/* Add member */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-3 text-lg font-bold text-white">Add member</h2>
        <form className="flex flex-wrap items-center gap-2" onSubmit={addMember}>
          <input
            className={`${inputBase} min-w-48 flex-1`}
            placeholder="Member name"
            value={name}
            maxLength={100}
            required
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </form>
      </section>

      {/* Global events toggle */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur">
        <button
          type="button"
          onClick={() => setEventsOpen(!eventsOpen)}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <div>
            <h2 className="text-lg font-bold text-white">Global Events</h2>
            <p className="text-sm text-slate-400">
              {globalVisits.length} field visit{globalVisits.length !== 1 ? 's' : ''} ·{' '}
              {globalMeetings.length} meeting{globalMeetings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-slate-400">{eventsOpen ? '▾' : '▸'}</span>
        </button>

        {eventsOpen && (
          <div className="space-y-4 border-t border-white/5 px-5 pb-5 pt-4">
            {/* Add field visit */}
            <form className="flex flex-wrap items-center gap-2" onSubmit={addGlobalVisit}>
              <input
                className={`${inputBase} min-w-36 flex-1`}
                placeholder="Visit name"
                value={visitName}
                maxLength={100}
                required
                disabled={addingVisit}
                onChange={(e) => setVisitName(e.target.value)}
              />
              <input
                className={inputBase}
                type="date"
                value={visitDate}
                required
                disabled={addingVisit}
                onChange={(e) => setVisitDate(e.target.value)}
              />
              <select
                className={`${inputBase} cursor-pointer`}
                value={visitShift}
                disabled={addingVisit}
                onChange={(e) => setVisitShift(e.target.value as 'Day' | 'Night')}
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
              <button
                type="submit"
                disabled={addingVisit || !visitName.trim() || !visitDate}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {addingVisit ? 'Adding…' : 'Add visit'}
              </button>
            </form>

            {/* Add meeting */}
            <form className="flex flex-wrap items-center gap-2" onSubmit={addGlobalMeeting}>
              <input
                className={`${inputBase} min-w-36 flex-1`}
                placeholder="Meeting name"
                value={meetingName}
                maxLength={100}
                required
                disabled={addingMeeting}
                onChange={(e) => setMeetingName(e.target.value)}
              />
              <input
                className={inputBase}
                type="date"
                value={meetingDate}
                required
                disabled={addingMeeting}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
              <button
                type="submit"
                disabled={addingMeeting || !meetingName.trim() || !meetingDate}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {addingMeeting ? 'Adding…' : 'Add meeting'}
              </button>
            </form>

            {/* Field visits list */}
            {globalVisits.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-slate-300">Field Visits</h3>
                <ul className="space-y-1">
                  {globalVisits.map((g) => (
                    <li key={g.id} className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium text-slate-100">{g.name}</span>
                        <span className="ml-2 text-slate-400">{g.date} ({g.shift})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteGlobalVisit(g.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Meetings list */}
            {globalMeetings.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-slate-300">Meetings</h3>
                <ul className="space-y-1">
                  {globalMeetings.map((g) => (
                    <li key={g.id} className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium text-slate-100">{g.name}</span>
                        <span className="ml-2 text-slate-400">{g.date}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteGlobalMeeting(g.id)}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {globalVisits.length === 0 && globalMeetings.length === 0 && (
              <p className="text-center text-sm text-slate-500">No global events yet. Add one above.</p>
            )}
          </div>
        )}
      </section>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {/* Leaderboard */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-3 text-lg font-bold text-white">Leaderboard</h2>
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-10 text-center text-sm text-slate-500">
            No members yet. Add the first member above.
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-200 border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={tableHead}>#</th>
                  <th className={tableHead}>Member</th>
                  <th className={tableHead}>Tasks /20</th>
                  <th className={tableHead}>Visits /30</th>
                  <th className={tableHead}>Meetings /30</th>
                  <th className={tableHead}>Interact /10</th>
                  <th className={tableHead}>Respect /10</th>
                  <th className={tableHead}>Bonus /10</th>
                  <th className={tableHead}>Total /110</th>
                  <th className={tableHead}>%</th>
                  <th className={tableHead}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => router.push(`/members/${member.id}`)}
                    className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.05]"
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ${rankClass(member.rank)}`}
                      >
                        {member.rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-violet-300">{member.name}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.tasks}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.fieldVisits}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.meetings}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.interaction}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.respectHierarchy}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.bonus}</td>
                    <td className="px-3 py-2.5 text-[15px] font-extrabold whitespace-nowrap text-white">
                      {member.total}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-300">{member.percentage}%</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <GradeBadge grade={member.grade} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-500">
        <BelloLogo size={18} />
        <span>Bello &middot; OER offline-first member evaluation &middot; scores out of 110</span>
      </footer>
    </main>
  );
}
