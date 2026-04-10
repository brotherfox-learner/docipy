"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  LabelList,
  ReferenceLine,
  type PieLabelRenderProps,
} from "recharts";

type SeriesPoint = { label: string; value: number };

type ChartLessonProps = {
  chartType: string;
  title: string;
  description: string;
  series: SeriesPoint[];
};

const PALETTE = [
  "#4f46e5",
  "#0d9488",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#2563eb",
  "#059669",
  "#ea580c",
];

function formatValue(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, { maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
}

function formatDelta(current: number, previous: number): string | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  if (!Number.isFinite(delta)) return null;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; payload?: SeriesPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const label = row?.payload?.label ?? row?.name ?? "";
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-600 dark:bg-slate-900">
      <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
      <p className="mt-1 text-base font-black text-indigo-600 dark:text-indigo-400">
        {formatValue(Number(row?.value))}
      </p>
    </div>
  );
}

function PieLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);
  const name = String(props.name ?? "");
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="fill-slate-700 text-[12px] font-semibold dark:fill-slate-200"
    >
      {name.length > 18 ? `${name.slice(0, 16)}...` : name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

export function ChartLesson({ chartType, title, description, series }: ChartLessonProps) {
  const safe = useMemo(
    () => series.filter((s) => typeof s.value === "number" && Number.isFinite(s.value)),
    [series]
  );

  const kind = chartType.toLowerCase().trim();
  const chipLabel =
    kind === "pie" ? "Composition" : kind === "line" ? "Trend" : kind === "area" ? "Change over scale" : "Comparison";

  const stats = useMemo(() => {
    if (safe.length === 0) {
      return {
        max: 0,
        total: 0,
        average: 0,
        lead: null as SeriesPoint | null,
        runnerUp: null as SeriesPoint | null,
        trend: null as string | null,
      };
    }
    const sorted = [...safe].sort((a, b) => b.value - a.value);
    const total = safe.reduce((sum, item) => sum + item.value, 0);
    const max = Math.max(...safe.map((item) => item.value), 1);
    const average = total / safe.length;
    const lead = sorted[0] ?? null;
    const runnerUp = sorted[1] ?? null;
    const trend =
      safe.length >= 2 ? formatDelta(safe[safe.length - 1]!.value, safe[0]!.value) : null;
    return { max, total, average, lead, runnerUp, trend };
  }, [safe]);

  const yAxisWidth = useMemo(() => {
    const longest = safe.reduce((m, s) => Math.max(m, s.label.length), 0);
    return Math.min(300, Math.max(120, longest * 7 + 24));
  }, [safe]);

  const chartHeight = useMemo(() => {
    if (kind === "pie") return 420;
    if (kind === "line" || kind === "area") return 400;
    return Math.max(360, safe.length * 52 + 120);
  }, [kind, safe.length]);

  if (safe.length === 0) {
    return <p className="text-sm text-slate-500">No chart data available for this lesson.</p>;
  }

  const barKind = kind === "bar" || kind === "comparison" || kind === "chart" || !["pie", "line", "area"].includes(kind);

  return (
    <article className="space-y-5">
      <header className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-200">
              <span className="material-symbols-outlined text-base" aria-hidden>
                show_chart
              </span>
              {chipLabel}
            </div>
            <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
            ) : null}
          </div>

          <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Highest
              </p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                {stats.lead ? formatValue(stats.lead.value) : "—"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                {stats.lead?.label ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Average
              </p>
              <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                {formatValue(Math.round(stats.average))}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {stats.trend ? `End vs start: ${stats.trend}` : `${safe.length} categories`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-4 pb-6 shadow-[0_20px_50px_rgba(148,163,184,0.12)] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none sm:p-6"
        role="img"
        aria-label={`${chipLabel} graph: ${title}`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-white/10">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Graph view</p>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            Total <span className="text-slate-900 dark:text-white">{formatValue(Math.round(stats.total))}</span>
          </p>
        </div>

        <div className="w-full">
          <ResponsiveContainer width="100%" height={chartHeight}>
            {barKind ? (
              <BarChart
                layout="vertical"
                data={safe}
                margin={{ top: 12, right: 28, left: 8, bottom: 12 }}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="4 4" className="stroke-slate-200 dark:stroke-slate-700/60" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 14, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={yAxisWidth}
                  tick={{ fontSize: 14, fill: "#475569" }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.06)" }} />
                <ReferenceLine
                  x={stats.average}
                  stroke="#94a3b8"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Avg",
                    position: "top",
                    fill: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={44}>
                  {safe.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    content={(raw) => {
                      const p = raw as {
                        x?: string | number;
                        y?: string | number;
                        width?: string | number;
                        height?: string | number;
                        value?: unknown;
                      };
                      const x = Number(p.x);
                      const y = Number(p.y);
                      const w = Number(p.width);
                      const h = Number(p.height);
                      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(h)) return null;
                      const num = typeof p.value === "number" ? p.value : Number(p.value);
                      const tx = x + (Number.isFinite(w) ? w : 0) + 10;
                      const ty = y + h / 2 + 5;
                      return (
                        <text
                          x={tx}
                          y={ty}
                          className="fill-slate-900 text-sm font-extrabold dark:fill-slate-100"
                          textAnchor="start"
                        >
                          {formatValue(Number.isFinite(num) ? num : 0)}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            ) : kind === "pie" ? (
              <PieChart>
                <Pie
                  data={safe}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="48%"
                  innerRadius="42%"
                  outerRadius="72%"
                  paddingAngle={2}
                  label={PieLabel}
                >
                  {safe.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => <span className="text-sm text-slate-700 dark:text-slate-300">{value}</span>}
                />
              </PieChart>
            ) : kind === "area" ? (
              <AreaChart data={safe} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="lessonArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" className="stroke-slate-200 dark:stroke-slate-700/60" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={safe.length > 6 ? -25 : 0}
                  textAnchor={safe.length > 6 ? "end" : "middle"}
                  height={safe.length > 6 ? 70 : 36}
                />
                <YAxis
                  tick={{ fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fill="url(#lessonArea)"
                  dot={{ r: 5, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            ) : (
              <LineChart data={safe} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="4 4" className="stroke-slate-200 dark:stroke-slate-700/60" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={safe.length > 6 ? -25 : 0}
                  textAnchor={safe.length > 6 ? "end" : "middle"}
                  height={safe.length > 6 ? 70 : 36}
                />
                <YAxis
                  tick={{ fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatValue}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        <p className="mt-4 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
          Numbers are summaries from your document — use them to compare categories at a glance.
        </p>
      </section>
    </article>
  );
}
