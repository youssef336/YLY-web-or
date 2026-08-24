'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type DragEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { BelloLogo } from '@/components/bello-logo';
import { useIsClient } from '@/hooks/use-is-client';
import { mergeExcelFiles, type OfficialEvent, type OfficialTask } from '@/infrastructure/excel/excel-merger';

const inputBase =
  'rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch { /* ignore */ }
  return fallback;
}

function persist<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function LeaderDashboardPage() {
  const isClient = useIsClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State starts with fallback defaults — localStorage is NOT read during SSR.
  const [officialVisits, setOfficialVisits] = useState<OfficialEvent[]>([]);
  const [officialMeetings, setOfficialMeetings] = useState<OfficialEvent[]>([]);
  const [officialTasks, setOfficialTasks] = useState<OfficialTask[]>([]);
  const [visitName, setVisitName] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitShift, setVisitShift] = useState<'Day' | 'Night'>('Day');
  const [meetingName, setMeetingName] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [targetTasks, setTargetTasks] = useState(10);
  const [targetMeetings, setTargetMeetings] = useState(15);
  const [targetFieldVisits, setTargetFieldVisits] = useState(15);

  // Hydrate from localStorage AFTER first client mount (never during SSR).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydration-safe: reads localStorage once after mount */
    setOfficialVisits(loadJson('bello_official_visits', []));
    setOfficialMeetings(loadJson('bello_official_meetings', []));
    setOfficialTasks(loadJson('bello_official_tasks', []));
    setTargetTasks(loadNumber('bello_target_tasks', 10));
    setTargetMeetings(loadNumber('bello_target_meetings', 15));
    setTargetFieldVisits(loadNumber('bello_target_field_visits', 15));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const accept = '.xlsx,.xls';

  // --- File handling ---
  function handleFiles(newFiles: FileList | File[]): void {
    const xlsxFiles = Array.from(newFiles).filter(
      (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'),
    );
    if (xlsxFiles.length === 0) {
      setError('Please upload .xlsx or .xls files only.');
      return;
    }
    setError(null);
    setResult(null);
    setFiles((prev) => [...prev, ...xlsxFiles]);
  }

  function onDrop(e: DragEvent): void {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: DragEvent): void {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave(): void {
    setDragging(false);
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  // --- Official event handling ---
  function addVisit(e: FormEvent): void {
    e.preventDefault();
    if (!visitName.trim() || !visitDate) return;
    if (officialVisits.some((v) => v.date === visitDate && v.shift === visitShift)) {
      setError('A field visit for this date and shift already exists.');
      return;
    }
    const next = [...officialVisits, { name: visitName.trim(), date: visitDate, shift: visitShift }];
    setOfficialVisits(next);
    persist('bello_official_visits', next);
    setVisitName('');
    setVisitDate('');
    setVisitShift('Day');
    setError(null);
  }

  function removeVisit(index: number): void {
    const next = officialVisits.filter((_, i) => i !== index);
    setOfficialVisits(next);
    persist('bello_official_visits', next);
  }

  function addMeeting(e: FormEvent): void {
    e.preventDefault();
    if (!meetingName.trim() || !meetingDate) return;
    if (officialMeetings.some((m) => m.date === meetingDate && m.name === meetingName.trim())) {
      setError('This meeting name and date already exists.');
      return;
    }
    const next = [...officialMeetings, { name: meetingName.trim(), date: meetingDate }];
    setOfficialMeetings(next);
    persist('bello_official_meetings', next);
    setMeetingName('');
    setMeetingDate('');
    setError(null);
  }

  function removeMeeting(index: number): void {
    const next = officialMeetings.filter((_, i) => i !== index);
    setOfficialMeetings(next);
    persist('bello_official_meetings', next);
  }

  function updateTask(index: number, field: 'name' | 'date', value: string): void {
    const next = officialTasks.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    setOfficialTasks(next);
    persist('bello_official_tasks', next);
  }

  function addTask(): void {
    const next = [...officialTasks, { name: '', date: '' }];
    setOfficialTasks(next);
    persist('bello_official_tasks', next);
  }

  function removeTask(index: number): void {
    const next = officialTasks.filter((_, i) => i !== index);
    setOfficialTasks(next);
    persist('bello_official_tasks', next);
  }

  function updateTarget(key: 'tasks' | 'meetings' | 'fieldVisits', value: number): void {
    if (key === 'tasks') { setTargetTasks(value); persist('bello_target_tasks', value); }
    if (key === 'meetings') { setTargetMeetings(value); persist('bello_target_meetings', value); }
    if (key === 'fieldVisits') { setTargetFieldVisits(value); persist('bello_target_field_visits', value); }
  }

  // --- Merge ---
  const handleMerge = useCallback(async () => {
    if (files.length === 0) return;
    if (officialVisits.length === 0 && officialMeetings.length === 0) {
      setError('Define at least one official field visit or meeting before merging.');
      return;
    }
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const mergedBytes = await mergeExcelFiles(
        files,
        officialVisits,
        officialMeetings,
        officialTasks,
        { tasks: targetTasks, meetings: targetMeetings, fieldVisits: targetFieldVisits },
      );

      const blob = new Blob([new Uint8Array(mergedBytes)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'OER_Master_Report.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setResult('OER_Master_Report.xlsx');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setProcessing(false);
    }
  }, [files, officialVisits, officialMeetings, officialTasks, targetTasks, targetMeetings, targetFieldVisits]);

  // During SSR / before hydration, render a minimal skeleton to avoid mismatches.
  if (!isClient) {
    return (
      <main className="animate-bello-in mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6">
        <div className="mb-5 h-5 w-32 rounded bg-white/5" />
        <header className="mb-8 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/5" />
          <div>
            <div className="h-7 w-56 rounded bg-white/5" />
            <div className="mt-1 h-4 w-72 rounded bg-white/5" />
          </div>
        </header>
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <div className="h-6 w-48 rounded bg-white/5" />
        </section>
      </main>
    );
  }

  return (
    <main className="animate-bello-in mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
      >
        <span aria-hidden>&larr;</span> Back to leaderboard
      </Link>

      <header className="mb-8">
        <div className="flex items-center gap-3">
          <BelloLogo size={40} />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Leader Dashboard
            </h1>
            <p className="text-sm text-slate-400">
              Define official events, then merge evaluator exports into one ORMEMBER master report
            </p>
          </div>
        </div>
      </header>

      {/* Step 1: Official Events */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-1 text-lg font-bold text-white">Step 1: Define Official Events</h2>
        <p className="mb-4 text-sm text-slate-400">
          These become the master column headers. Sub-leader data is mapped by matching dates.
        </p>

        {/* Official HR Tasks (Name + Date) */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">HR Tasks (up to 10)</h3>
          {officialTasks.map((task, i) => (
            <div key={i} className="mb-1.5 flex items-center gap-2">
              <span className="w-6 text-xs text-slate-500">T{i + 1}</span>
              <input
                className={`${inputBase} min-w-0 flex-1`}
                placeholder={`Task ${i + 1} name`}
                value={task.name}
                maxLength={50}
                onChange={(e) => updateTask(i, 'name', e.target.value)}
              />
              <input
                className={inputBase}
                type="date"
                value={task.date}
                onChange={(e) => updateTask(i, 'date', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeTask(i)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
              >
                Remove
              </button>
            </div>
          ))}
          {officialTasks.length < 10 && (
            <button
              type="button"
              onClick={addTask}
              className="mt-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/10"
            >
              + Add task
            </button>
          )}
        </div>

        {/* Official Field Visits */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Field Visits</h3>
          <form className="flex flex-wrap items-center gap-2" onSubmit={addVisit}>
            <input
              className={`${inputBase} min-w-36 flex-1`}
              placeholder="Visit name"
              value={visitName}
              maxLength={100}
              required
              onChange={(e) => setVisitName(e.target.value)}
            />
            <input
              className={inputBase}
              type="date"
              value={visitDate}
              required
              onChange={(e) => setVisitDate(e.target.value)}
            />
            <select
              className={inputBase}
              value={visitShift}
              onChange={(e) => setVisitShift(e.target.value as 'Day' | 'Night')}
            >
              <option value="Day">Day</option>
              <option value="Night">Night</option>
            </select>
            <button
              type="submit"
              disabled={!visitName.trim() || !visitDate}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </form>
          {officialVisits.length > 0 && (
            <ul className="mt-2 space-y-1">
              {officialVisits.map((ev, i) => (
                <li key={`${ev.date}-${ev.shift ?? ''}-${i}`} className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-slate-100">
                      {ev.name} - {ev.date} ({ev.shift ?? 'Day'})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVisit(i)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Official Meetings */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Meetings</h3>
          <form className="flex flex-wrap items-center gap-2" onSubmit={addMeeting}>
            <input
              className={`${inputBase} min-w-36 flex-1`}
              placeholder="Meeting name"
              value={meetingName}
              maxLength={100}
              required
              onChange={(e) => setMeetingName(e.target.value)}
            />
            <input
              className={inputBase}
              type="date"
              value={meetingDate}
              required
              onChange={(e) => setMeetingDate(e.target.value)}
            />
            <button
              type="submit"
              disabled={!meetingName.trim() || !meetingDate}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
          </form>
          {officialMeetings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {officialMeetings.map((ev, i) => (
                <li key={`${ev.date}-${i}`} className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-slate-100">{ev.name} - {ev.date}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMeeting(i)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Monthly Targets */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Monthly Targets</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tasks Entered</label>
              <input
                className={`${inputBase} w-24`}
                type="number"
                min={1}
                value={targetTasks}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) updateTarget('tasks', n);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Meetings Entered</label>
              <input
                className={`${inputBase} w-24`}
                type="number"
                min={1}
                value={targetMeetings}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) updateTarget('meetings', n);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Field Visits Entered</label>
              <input
                className={`${inputBase} w-24`}
                type="number"
                min={1}
                value={targetFieldVisits}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) updateTarget('fieldVisits', n);
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Upload files */}
      <section
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragging
            ? 'border-violet-400 bg-violet-500/10'
            : 'border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />
        <div className="mb-3 text-3xl text-slate-500">&#128206;</div>
        <p className="text-sm font-medium text-slate-300">
          {dragging ? 'Drop files here' : 'Step 2: Drag & drop .xlsx files or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Upload exports from sub-leaders — scores are mapped by date to your official events
        </p>
      </section>

      {/* File list + merge */}
      {files.length > 0 && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Uploaded Files ({files.length})
            </h2>
            <button
              type="button"
              onClick={() => { setFiles([]); setResult(null); }}
              className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
            >
              Clear all
            </button>
          </div>
          <ul className="space-y-1.5">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-xl bg-slate-950/40 px-3 py-2 text-sm"
              >
                <span className="truncate text-slate-200">{file.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/15"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void handleMerge()}
            disabled={processing || (officialVisits.length === 0 && officialMeetings.length === 0)}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processing
              ? 'Merging files...'
              : `Merge ${files.length} file${files.length !== 1 ? 's' : ''} into Master`}
          </button>
        </section>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 backdrop-blur">
          <h2 className="mb-1 text-lg font-bold text-emerald-300">Merge Complete</h2>
          <p className="text-sm text-emerald-200/80">
            Download started for <span className="font-mono">{result}</span>
          </p>
        </section>
      )}

      {/* How it works */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
        <h2 className="mb-3 text-lg font-bold text-white">How it works</h2>
        <ol className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="font-bold text-violet-400">1.</span>
            Define official field visits (name + date + shift), meetings (name + date), tasks (name + date), and monthly targets. These become the master column headers and &quot;Entered&quot; counts.
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-violet-400">2.</span>
            Upload the ORMEMBER .xlsx files exported by your sub-leaders.
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-violet-400">3.</span>
            The system reads each file&apos;s Row 3 dates and maps scores to the matching master columns by date — sub-leader event names are ignored. Tasks, visits, and meetings are all date-matched.
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-violet-400">4.</span>
            The merged <span className="font-mono">OER_Master_Report.xlsx</span> is downloaded with all formulas intact and &quot;Entered&quot; columns filled.
          </li>
        </ol>
      </section>

      <footer className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-500">
        <BelloLogo size={18} />
        <span>Bello &middot; OER offline-first member evaluation</span>
      </footer>
    </main>
  );
}
