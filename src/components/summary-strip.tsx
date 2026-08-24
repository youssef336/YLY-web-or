import { GradeBadge } from './grade-badge';

export interface ScoreSummaryView {
  tasks: number;
  fieldVisits: number;
  meetings: number;
  interaction: number;
  respectHierarchy: number;
  bonus: number;
  total: number;
  percentage: number;
  grade: string;
}

const stats: Array<{ key: keyof ScoreSummaryView; label: string }> = [
  { key: 'tasks', label: 'Tasks /20' },
  { key: 'fieldVisits', label: 'Visits /30' },
  { key: 'meetings', label: 'Meetings /30' },
  { key: 'interaction', label: 'Interaction /10' },
  { key: 'respectHierarchy', label: 'Respect /10' },
  { key: 'bonus', label: 'Bonus /10' },
];

/** Live score summary strip shown at the top of a member profile. */
export function SummaryStrip({ summary }: { summary: ScoreSummaryView }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-9">
      {stats.map(({ key, label }) => (
        <div
          key={key}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center backdrop-blur"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </div>
          <div className="mt-0.5 text-xl font-extrabold text-slate-100">{summary[key]}</div>
        </div>
      ))}

      <div className="rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 px-3 py-2.5 text-center shadow-lg shadow-violet-950/40">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
          Total /110
        </div>
        <div className="mt-0.5 text-xl font-extrabold text-white">{summary.total}</div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center backdrop-blur">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Percentage
        </div>
        <div className="mt-0.5 text-xl font-extrabold text-slate-100">{summary.percentage}%</div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center backdrop-blur">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Grade
        </div>
        <div className="mt-1 flex justify-center">
          <GradeBadge grade={summary.grade} />
        </div>
      </div>
    </div>
  );
}
