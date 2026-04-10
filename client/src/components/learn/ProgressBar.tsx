"use client";

type ProgressBarProps = {
  current: number;
  total: number;
  label?: string;
};

export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round(((current + 1) / total) * 100)) : 0;

  return (
    <section aria-label={label ?? "Lesson progress"} className="w-full space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        <span>{label ?? "Progress"}</span>
        <span className="tabular-nums text-slate-700 dark:text-slate-200">
          {current + 1} / {total}
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#315efb_55%,#0f172a_100%)] transition-[width] duration-500 ease-out dark:bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_55%,#e2e8f0_100%)]"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{pct}% complete</p>
      </div>
    </section>
  );
}
