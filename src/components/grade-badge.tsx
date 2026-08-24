const gradeStyles: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40',
  B: 'bg-teal-500/15 text-teal-300 ring-teal-400/40',
  C: 'bg-amber-500/15 text-amber-300 ring-amber-400/40',
  D: 'bg-orange-500/15 text-orange-300 ring-orange-400/40',
  F: 'bg-rose-500/15 text-rose-300 ring-rose-400/40',
};

/** Colored grade pill (A-F) used on the leaderboard and profile summary. */
export function GradeBadge({ grade }: { grade: string }) {
  const style = gradeStyles[grade] ?? gradeStyles.F;
  return (
    <span
      className={`inline-flex min-w-9 items-center justify-center rounded-lg px-2 py-0.5 text-xs font-bold ring-1 ${style}`}
    >
      {grade}
    </span>
  );
}