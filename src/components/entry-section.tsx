'use client';

import { useState, type FormEvent, type ReactNode } from 'react';

export type EntryScore = 0 | 0.5 | 1;

export interface EntryItem {
  id: string;
  globalEventId: string;
  name?: string;
  date: string;
  score: number;
}

export interface GlobalEventOption {
  id: string;
  label: string;
}

const inputBase =
  'rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Editable list for Field Visits / Meetings. The add form uses a dropdown of
 * global events (created on the Home page) instead of free-text inputs.
 */
export function EntrySection({
  title,
  description,
  kind,
  entries,
  globalEvents,
  max,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  description: ReactNode;
  kind: 'visit' | 'meeting';
  entries: EntryItem[];
  globalEvents: GlobalEventOption[];
  max?: number;
  disabled?: boolean;
  onAdd: (input: { globalEventId: string; score: number }) => Promise<unknown>;
  onUpdate: (id: string, input: { score: number }) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const isVisit = kind === 'visit';
  const scoreOptions = isVisit
    ? [
        { value: 1, label: '1 - Complete' },
        { value: 0.5, label: '0.5 - Excused' },
        { value: 0, label: '0 - Incomplete' },
      ]
    : [
        { value: 1, label: '1 - Attended' },
        { value: 0.5, label: '0.5 - Excused' },
        { value: 0, label: '0 - Absent' },
      ];
  const statusLabel = (score: number): string =>
    isVisit
      ? score === 1
        ? 'Complete'
        : score === 0.5
          ? 'Excused'
          : 'Incomplete'
      : score === 1
        ? 'Attended'
        : score === 0.5
          ? 'Excused'
          : 'Absent';

  const [addGlobalEventId, setAddGlobalEventId] = useState('');
  const [addScore, setAddScore] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState(1);
  const [busy, setBusy] = useState(false);
  const atLimit = max != null && entries.length >= max;

  async function handleAdd(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!addGlobalEventId || atLimit) return;
    setBusy(true);
    try {
      await onAdd({ globalEventId: addGlobalEventId, score: addScore as EntryScore });
      setAddGlobalEventId('');
      setAddScore(1);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: EntryItem): void {
    setEditingId(item.id);
    setEditScore(item.score);
  }

  async function handleEdit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    try {
      await onUpdate(editingId, { score: editScore as EntryScore });
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <h2 className="mb-1 text-lg font-bold text-white">{title}</h2>
      <p className="mb-4 text-sm text-slate-400">{description}</p>

      <form className="flex flex-wrap items-center gap-2" onSubmit={handleAdd}>
        <select
          className={`${inputBase} min-w-48 flex-1 cursor-pointer`}
          value={addGlobalEventId}
          disabled={disabled || busy || atLimit}
          onChange={(e) => setAddGlobalEventId(e.target.value)}
          aria-label={isVisit ? 'Select field visit' : 'Select meeting'}
          required
        >
          <option value="">{isVisit ? 'Select a field visit…' : 'Select a meeting…'}</option>
          {globalEvents.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>

        <select
          className={`${inputBase} cursor-pointer`}
          value={addScore}
          disabled={disabled || busy || atLimit}
          onChange={(e) => setAddScore(Number(e.target.value))}
          aria-label="Score"
        >
          {scoreOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={disabled || busy || atLimit || !addGlobalEventId}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Saving…' : isVisit ? 'Add visit' : 'Add meeting'}
        </button>
      </form>

      {globalEvents.length === 0 && (
        <p className="mt-2 text-xs text-amber-300">
          No global {isVisit ? 'field visits' : 'meetings'} created yet. Add them from the Home page.
        </p>
      )}

      {atLimit && (
        <p className="mt-2 text-xs text-amber-300">Maximum {max} {isVisit ? 'visits' : 'meetings'} reached.</p>
      )}

      <ul className="mt-4 space-y-2">
        {entries.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-sm text-slate-500">
            No {isVisit ? 'visits' : 'meetings'} recorded yet.
          </li>
        ) : (
          entries.map((item) =>
            editingId === item.id ? (
              <li key={item.id}>
                <form className="flex flex-wrap items-center gap-2" onSubmit={handleEdit}>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                    {isVisit && item.name && <span className="font-medium text-slate-100">{item.name} — </span>}
                    {item.date}
                  </span>
                  <select
                    className={`${inputBase} cursor-pointer`}
                    value={editScore}
                    disabled={disabled || busy}
                    onChange={(e) => setEditScore(Number(e.target.value))}
                    aria-label="Score"
                  >
                    {scoreOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={disabled || busy}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() => setEditingId(null)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </form>
              </li>
            ) : (
              <li
                key={item.id}
                className="group flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-white/10"
              >
                <div className="min-w-0 flex-1">
                  {isVisit && item.name && (
                    <div className="truncate text-sm font-medium text-slate-100">{item.name}</div>
                  )}
                  <div className="text-xs text-slate-400">{item.date}</div>
                </div>
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ${
                    item.score === 1
                      ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
                      : 'bg-rose-500/15 text-rose-300 ring-rose-400/30'
                  }`}
                >
                  {statusLabel(item.score)}
                </span>
                <button
                  type="button"
                  title="Edit"
                  disabled={disabled || busy}
                  onClick={() => startEdit(item)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  title="Remove"
                  disabled={disabled || busy}
                  onClick={() => void onRemove(item.id)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  Remove
                </button>
              </li>
            ),
          )
        )}
      </ul>
    </section>
  );
}