'use client';

import { useState, type FormEvent } from 'react';
import type { HrTask, HrTaskScore, HrQualityScore } from '@/domain/entities/hr-task';
import { HR_TASK_SCORE_OPTIONS, HR_QUALITY_SCORE_OPTIONS } from '@/domain/entities/hr-task';

const inputBase =
  'rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50';

function formatTaskLabel(task: HrTask): string {
  return task.date ? `${task.name} - ${task.date}` : task.name;
}

/**
 * HR Tasks section — dynamic list where evaluators add/edit/remove tasks.
 * Each task has a name, date, and 3 metrics: T (Submission), Q (Quality), D (Deadline).
 * Max 10 tasks (fills columns AK..CT in the OER template).
 */
export function HrTaskSection({
  tasks,
  max,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: {
  tasks: HrTask[];
  max: number;
  disabled?: boolean;
  onAdd: (input: { name: string; date: string; t: HrTaskScore; q: HrQualityScore; d: HrTaskScore }) => Promise<unknown>;
  onUpdate: (id: string, input: { t: HrTaskScore; q: HrQualityScore; d: HrTaskScore }) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [addName, setAddName] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addT, setAddT] = useState<HrTaskScore>(1);
  const [addQ, setAddQ] = useState<HrQualityScore>(5);
  const [addD, setAddD] = useState<HrTaskScore>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editT, setEditT] = useState<HrTaskScore>(1);
  const [editQ, setEditQ] = useState<HrQualityScore>(5);
  const [editD, setEditD] = useState<HrTaskScore>(1);
  const [busy, setBusy] = useState(false);
  const atLimit = tasks.length >= max;

  async function handleAdd(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!addName.trim() || atLimit) return;
    setBusy(true);
    try {
      await onAdd({ name: addName.trim(), date: addDate, t: addT, q: addQ, d: addD });
      setAddName('');
      setAddDate('');
      setAddT(1);
      setAddQ(5);
      setAddD(1);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(task: HrTask): void {
    setEditingId(task.id);
    setEditT(task.t);
    setEditQ(task.q);
    setEditD(task.d);
  }

  async function handleEdit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    try {
      await onUpdate(editingId, { t: editT, q: editQ, d: editD });
      setEditingId(null);
    } finally {
      setBusy(false);
    }
  }

  const totalScore = tasks.reduce((sum, t) => sum + t.t * t.q * t.d, 0);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">HR Tasks</h2>
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-white/10">
          /20
        </span>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Each task evaluates 3 metrics: <span className="font-medium text-slate-200">T</span> (Submission),
        <span className="font-medium text-slate-200"> Q</span> (Quality /5),
        <span className="font-medium text-slate-200"> D</span> (Deadline).
        Task score = T x Q x D. Max 10 tasks.
      </p>

      <form className="flex flex-wrap items-end gap-2" onSubmit={handleAdd}>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-400">Task Name</label>
          <input
            className={`${inputBase} w-full`}
            placeholder="e.g. Report Submission"
            value={addName}
            maxLength={100}
            disabled={disabled || busy || atLimit}
            onChange={(e) => setAddName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Date</label>
          <input
            className={inputBase}
            type="date"
            value={addDate}
            disabled={disabled || busy || atLimit}
            onChange={(e) => setAddDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">T</label>
          <select
            className={`${inputBase} cursor-pointer`}
            value={addT}
            disabled={disabled || busy || atLimit}
            onChange={(e) => setAddT(Number(e.target.value) as HrTaskScore)}
          >
            {HR_TASK_SCORE_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Q</label>
          <select
            className={`${inputBase} cursor-pointer`}
            value={addQ}
            disabled={disabled || busy || atLimit}
            onChange={(e) => setAddQ(Number(e.target.value) as HrQualityScore)}
          >
            {HR_QUALITY_SCORE_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">D</label>
          <select
            className={`${inputBase} cursor-pointer`}
            value={addD}
            disabled={disabled || busy || atLimit}
            onChange={(e) => setAddD(Number(e.target.value) as HrTaskScore)}
          >
            {HR_TASK_SCORE_OPTIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={disabled || busy || atLimit || !addName.trim()}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Saving...' : 'Add Task'}
        </button>
      </form>

      {atLimit && (
        <p className="mt-2 text-xs text-amber-300">Maximum {max} tasks reached.</p>
      )}

      <ul className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-sm text-slate-500">
            No HR tasks recorded yet.
          </li>
        ) : (
          <>
            {tasks
              .slice()
              .sort((a, b) => a.taskIndex - b.taskIndex)
              .map((task) =>
                editingId === task.id ? (
                  <li key={task.id}>
                    <form className="flex flex-wrap items-center gap-2" onSubmit={handleEdit}>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                        {formatTaskLabel(task)}
                      </span>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-slate-400">T</label>
                        <select
                          className={`${inputBase} w-16 cursor-pointer`}
                          value={editT}
                          disabled={disabled || busy}
                          onChange={(e) => setEditT(Number(e.target.value) as HrTaskScore)}
                        >
                          {HR_TASK_SCORE_OPTIONS.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-slate-400">Q</label>
                        <select
                          className={`${inputBase} w-16 cursor-pointer`}
                          value={editQ}
                          disabled={disabled || busy}
                          onChange={(e) => setEditQ(Number(e.target.value) as HrQualityScore)}
                        >
                          {HR_QUALITY_SCORE_OPTIONS.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-slate-400">D</label>
                        <select
                          className={`${inputBase} w-16 cursor-pointer`}
                          value={editD}
                          disabled={disabled || busy}
                          onChange={(e) => setEditD(Number(e.target.value) as HrTaskScore)}
                        >
                          {HR_TASK_SCORE_OPTIONS.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
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
                    key={task.id}
                    className="group flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-100">{formatTaskLabel(task)}</div>
                      <div className="mt-0.5 flex gap-3 text-xs text-slate-400">
                        <span>T: <span className="font-medium text-slate-200">{task.t}</span></span>
                        <span>Q: <span className="font-medium text-slate-200">{task.q}/5</span></span>
                        <span>D: <span className="font-medium text-slate-200">{task.d}</span></span>
                      </div>
                    </div>
                    <span className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-xs font-bold text-violet-300 ring-1 ring-violet-400/30">
                      {(task.t * task.q * task.d).toFixed(1)} pts
                    </span>
                    <button
                      type="button"
                      title="Edit"
                      disabled={disabled || busy}
                      onClick={() => startEdit(task)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      title="Remove"
                      disabled={disabled || busy}
                      onClick={() => void onRemove(task.id)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  </li>
                ),
              )}
            <li className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-right text-sm font-bold text-violet-300">
              Tasks Total: {totalScore.toFixed(2)} / 20
            </li>
          </>
        )}
      </ul>
    </section>
  );
}
