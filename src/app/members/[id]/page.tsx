'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getContainer } from '@/infrastructure/container';
import { downloadWorkbook } from '@/infrastructure/download';
import { profileToView, type ProfileView } from '@/interface-adapters/presenters/profile.presenter';
import type { GlobalFieldVisit } from '@/domain/entities/global-field-visit';
import type { GlobalMeeting } from '@/domain/entities/global-meeting';
import type { HrTaskScore, HrQualityScore } from '@/domain/entities/hr-task';
import { BelloLogo } from '@/components/bello-logo';
import { SummaryStrip } from '@/components/summary-strip';
import { CategoryScoreField } from '@/components/category-score-field';
import { HrTaskSection } from '@/components/hr-task-section';
import { EntrySection, type GlobalEventOption } from '@/components/entry-section';

const inputBase =
  'rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50';

const MAX_HR_TASKS = 10;

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const memberId = params.id;

  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [globalVisits, setGlobalVisits] = useState<GlobalFieldVisit[]>([]);
  const [globalMeetings, setGlobalMeetings] = useState<GlobalMeeting[]>([]);
  const [renameDraft, setRenameDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = getContainer();
      const [p, gv, gm] = await Promise.all([
        c.getMemberProfile.execute(memberId),
        c.listGlobalFieldVisits.execute(),
        c.listGlobalMeetings.execute(),
      ]);
      const view = profileToView(p, gv, gm);
      setProfile(view);
      setGlobalVisits(gv);
      setGlobalMeetings(gm);
      setRenameDraft(view.member.name);
      setError(null);
    } catch {
      setError('Member not found');
    }
  }, [memberId]);

  useEffect(() => {
    let active = true;
    const c = getContainer();
    Promise.all([
      c.getMemberProfile.execute(memberId),
      c.listGlobalFieldVisits.execute(),
      c.listGlobalMeetings.execute(),
    ])
      .then(([p, gv, gm]) => {
        if (!active) return;
        const view = profileToView(p, gv, gm);
        setProfile(view);
        setGlobalVisits(gv);
        setGlobalMeetings(gm);
        setRenameDraft(view.member.name);
        setError(null);
      })
      .catch(() => {
        if (active) setError('Member not found');
      });
    return () => {
      active = false;
    };
  }, [memberId]);

  async function mutate(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function saveCategory(key: 'interaction' | 'respectHierarchy' | 'bonus', score: number) {
    const current = profile?.scores ?? { interaction: 0, respectHierarchy: 0, bonus: 0 };
    return mutate(() =>
      getContainer().updateCategoryScores.execute(memberId, {
        interaction: key === 'interaction' ? score : current.interaction,
        respectHierarchy: key === 'respectHierarchy' ? score : current.respectHierarchy,
        bonus: key === 'bonus' ? score : current.bonus,
      }),
    );
  }

  async function saveRename(): Promise<void> {
    if (!renameDraft.trim() || renameDraft.trim() === profile?.member.name) return;
    await mutate(() => getContainer().updateMemberName.execute(memberId, { name: renameDraft.trim() }));
  }

  async function handleDelete(): Promise<void> {
    if (!profile) return;
    if (!window.confirm(`Delete ${profile.member.name} and all their evaluations? This cannot be undone.`))
      return;
    await mutate(() => getContainer().deleteMember.execute(memberId));
    router.push('/');
  }

  // ── HR Task callbacks ──

  async function addHrTask(input: { name: string; date: string; t: HrTaskScore; q: HrQualityScore; d: HrTaskScore }): Promise<void> {
    const existing = profile?.hrTasks ?? [];
    if (existing.length >= MAX_HR_TASKS) {
      setError('Maximum 10 HR tasks reached.');
      return;
    }
    const usedIndices = new Set(existing.map((t) => t.taskIndex));
    let nextIndex = 0;
    while (usedIndices.has(nextIndex) && nextIndex < MAX_HR_TASKS) nextIndex++;
    await mutate(() =>
      getContainer().addHrTask.execute(memberId, {
        name: input.name,
        date: input.date,
        taskIndex: nextIndex,
        t: input.t,
        q: input.q,
        d: input.d,
      }),
    );
  }

  async function updateHrTask(id: string, input: { t: HrTaskScore; q: HrQualityScore; d: HrTaskScore }): Promise<void> {
    await mutate(() => getContainer().updateHrTask.execute(id, input));
  }

  async function removeHrTask(id: string): Promise<void> {
    await mutate(() => getContainer().removeHrTask.execute(id));
  }

  // ── Export ──

  async function handleExport(): Promise<void> {
    setExporting(true);
    setMessage(null);
    try {
      const bytes = await getContainer().exportEvaluationToExcel.execute();
      downloadWorkbook(bytes);
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Export failed. Check that the template is bundled.',
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleWhatsApp(): Promise<void> {
    setMessage(null);
    try {
      const url = await getContainer().buildWhatsAppDeepLink.execute(memberId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not build WhatsApp link');
    }
  }

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-6xl justify-center px-4 py-24">
        <div className="text-slate-400">{error ?? 'Loading…'}</div>
      </main>
    );
  }

  // Filter out events already added to this member's profile
  const usedVisitIds = new Set(profile.fieldVisits.map((fv) => fv.globalEventId));
  const usedMeetingIds = new Set(profile.meetings.map((m) => m.globalEventId));

  const visitGlobalOptions: GlobalEventOption[] = [...globalVisits]
    .filter((gv) => !usedVisitIds.has(gv.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((gv) => ({ id: gv.id, label: `${gv.name} - ${gv.date} (${gv.shift})` }));

  const meetingGlobalOptions: GlobalEventOption[] = [...globalMeetings]
    .filter((gm) => !usedMeetingIds.has(gm.id))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((gm) => ({ id: gm.id, label: `${gm.name} - ${gm.date}` }));

  const fieldVisitCallbacks = {
    onAdd: (input: { globalEventId: string; score: number }) => {
      if (usedVisitIds.has(input.globalEventId)) {
        setError('This field visit has already been added for this member.');
        return Promise.resolve();
      }
      return mutate(() =>
        getContainer().addFieldVisit.execute(memberId, {
          globalEventId: input.globalEventId,
          score: input.score as 0 | 0.5 | 1,
        }),
      );
    },
    onUpdate: (id: string, input: { score: number }) =>
      mutate(() =>
        getContainer().updateFieldVisit.execute(memberId, id, {
          globalEventId: '',
          score: input.score as 0 | 0.5 | 1,
        }),
      ),
    onRemove: (id: string) => mutate(() => getContainer().removeFieldVisit.execute(id)),
  };

  const meetingCallbacks = {
    onAdd: (input: { globalEventId: string; score: number }) => {
      if (usedMeetingIds.has(input.globalEventId)) {
        setError('This meeting has already been added for this member.');
        return Promise.resolve();
      }
      return mutate(() =>
        getContainer().addMeeting.execute(memberId, {
          globalEventId: input.globalEventId,
          score: input.score as 0 | 0.5 | 1,
        }),
      );
    },
    onUpdate: (id: string, input: { score: number }) =>
      mutate(() =>
        getContainer().updateMeeting.execute(memberId, id, {
          globalEventId: '',
          score: input.score as 0 | 0.5 | 1,
        }),
      ),
    onRemove: (id: string) => mutate(() => getContainer().removeMeeting.execute(id)),
  };

  const initial = profile.member.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <main className="animate-bello-in mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
      >
        <span aria-hidden>&larr;</span> Back to leaderboard
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-2xl font-black text-white shadow-lg shadow-violet-600/30"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {profile.member.name}
          </h1>
          <p className="text-sm text-slate-400">
            OER Evaluation profile &middot; data stays on this device
          </p>
        </div>
      </header>

      <SummaryStrip summary={profile.summary} />

      {/* ── Member Info ── */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-3 text-lg font-bold text-white">Member</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputBase} min-w-44 flex-1`}
            value={renameDraft}
            maxLength={100}
            disabled={busy}
            onChange={(e) => setRenameDraft(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !renameDraft.trim() || renameDraft.trim() === profile.member.name}
            onClick={() => void saveRename()}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rename
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="rounded-xl border border-rose-400/30 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete member
          </button>
        </div>
      </section>

      {/* ── HR Tasks Section ── */}
      <section className="mt-4">
        <HrTaskSection
          tasks={profile.hrTasks}
          max={MAX_HR_TASKS}
          disabled={busy}
          onAdd={addHrTask}
          onUpdate={updateHrTask}
          onRemove={removeHrTask}
        />
      </section>

      {/* ── Category Scores ── */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-1 text-lg font-bold text-white">Category Scores</h2>
        <p className="mb-4 text-sm text-slate-400">
          Each category is saved independently. Values map 1:1 to the Interaction, Respect
          Hierarchy and Bonus columns of the ORMEMBER Excel template.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <CategoryScoreField
            label="Interaction"
            hint="Teamwork, communication and participation."
            value={profile.scores.interaction}
            accent="from-indigo-500 to-violet-500"
            disabled={busy}
            onSave={(score) => saveCategory('interaction', score)}
          />
          <CategoryScoreField
            label="Respect Hierarchy"
            hint="Discipline and deference to leadership."
            value={profile.scores.respectHierarchy}
            accent="from-violet-500 to-fuchsia-500"
            disabled={busy}
            onSave={(score) => saveCategory('respectHierarchy', score)}
          />
          <CategoryScoreField
            label="Bonus"
            hint="Extra effort above and beyond."
            value={profile.scores.bonus}
            accent="from-fuchsia-500 to-pink-500"
            disabled={busy}
            onSave={(score) => saveCategory('bonus', score)}
          />
        </div>
      </section>

      {/* ── Field Visits & Meetings ── */}
      <div className="mt-4 space-y-4">
        <EntrySection
          title="Field Visits"
          description={
            <>
              Pick a date and name the location / event. The label{' '}
              <span className="font-medium text-slate-200">&ldquo;Name - Date&rdquo;</span> becomes the
              column header in the ORMEMBER Excel template; the score (1 complete / 0 incomplete) is
              placed in this member&apos;s row under that column.
            </>
          }
          kind="visit"
          entries={profile.fieldVisits}
          globalEvents={visitGlobalOptions}
          max={15}
          disabled={busy}
          onAdd={fieldVisitCallbacks.onAdd}
          onUpdate={fieldVisitCallbacks.onUpdate}
          onRemove={fieldVisitCallbacks.onRemove}
        />

        <EntrySection
          title="Meetings"
          description={
            <>
              Pick a meeting name and date. The label{' '}
              <span className="font-medium text-slate-200">&ldquo;Name - Date&rdquo;</span> becomes
              the column header in the ORMEMBER Excel template; the score (1 attended / 0 absent) is
              placed in this member&apos;s row under that column.
            </>
          }
          kind="meeting"
          entries={profile.meetings}
          globalEvents={meetingGlobalOptions}
          max={15}
          disabled={busy}
          onAdd={meetingCallbacks.onAdd}
          onUpdate={meetingCallbacks.onUpdate}
          onRemove={meetingCallbacks.onRemove}
        />
      </div>

      {/* ── Export & Report ── */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-1 text-lg font-bold text-white">Submit &amp; Report</h2>
        <p className="mb-4 text-sm text-slate-400">
          OER template with every member&apos;s scores injected into exact
          cells, or share this member&apos;s summary on WhatsApp (attach the Excel file manually).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={exporting}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {exporting ? 'Exporting…' : 'Export all to Excel'}
          </button>
          <button
            type="button"
            onClick={() => void handleWhatsApp()}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Share report on WhatsApp
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-rose-300">{message}</p>}
      </section>

      <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
        <BelloLogo size={18} />
        <span>Bello &middot; OER offline-first member evaluation</span>
      </footer>
    </main>
  );
}
