'use client';

import { useState } from 'react';

/**
 * One category score (Interaction / Respect Hierarchy / Bonus) with its OWN
 * Save button, so each category can be updated and persisted independently.
 */
export function CategoryScoreField({
  label,
  hint,
  value,
  accent,
  onSave,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  /** Tailwind gradient stops for the focused ring / accent. */
  accent: string;
  onSave: (score: number) => Promise<unknown> | unknown;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync the draft when the saved value changes (e.g. after this field is
  // saved and the profile is reloaded) — the documented "adjust state during
  // render" pattern, avoiding a resync effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(String(value));
    setDirty(false);
  }

  const parsed = Number(draft);
  const invalid = !Number.isInteger(parsed) || parsed < 0 || parsed > 10;
  const canSave = dirty && !invalid && !saving && !disabled;

  async function save(): Promise<void> {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(parsed);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition-colors focus-within:border-violet-400/50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-100">{label}</span>
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-white/10">
          /10
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={10}
          step={1}
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            setDraft(e.target.value);
            setDirty(true);
            setError(null);
          }}
          aria-label={label}
          className="w-20 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-center text-lg font-bold text-white outline-none transition-colors focus:border-violet-400/60"
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canSave}
          className={`flex-1 rounded-xl bg-gradient-to-r ${accent} px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    </div>
  );
}