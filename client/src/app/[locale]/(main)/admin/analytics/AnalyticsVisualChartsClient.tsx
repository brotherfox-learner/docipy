"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = ["#2563eb", "#06b6d4", "#0d9488", "#7c3aed", "#ea580c", "#ca8a04", "#64748b"];

export type PlanSlice = { plan: string; count: number };
export type WeekdayRow = { dayShort: string; dayIndex: number; count: number };
export type ContentSlice = { name: string; value: number };
export type DocTrendPoint = { day: string; count: number };

function formatPlan(plan: string): string {
  const t = plan.trim();
  if (!t) return "Unknown";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function AnalyticsVisualChartsClient({
  planDistribution,
  documentsByWeekday,
  documentsByWeekdaySubtitle,
  contentArtifactsTotal,
  documentsTrend,
}: {
  planDistribution: PlanSlice[];
  documentsByWeekday: WeekdayRow[];
  documentsByWeekdaySubtitle: string;
  contentArtifactsTotal: ContentSlice[];
  documentsTrend: DocTrendPoint[];
}) {
  const planData = planDistribution.map((p) => ({
    name: formatPlan(p.plan),
    value: p.count,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <header className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Users by plan</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Active accounts</p>
        </header>
        <div className="h-64 w-full min-w-0">
          {planData.length === 0 || planData.every((d) => d.value === 0) ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No plan data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Pie
                  data={planData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="72%"
                  paddingAngle={2}
                >
                  {planData.map((slice, i) => (
                    <Cell key={`plan-${slice.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip labelClassName="text-slate-900 dark:text-white" />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <header className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Generated content (all time)</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Summaries, learn paths, quizzes, flashcards, knowledge graphs, and AI chat messages
          </p>
        </header>
        <div className="h-64 w-full min-w-0">
          {contentArtifactsTotal.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No artifacts yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Pie
                  data={contentArtifactsTotal}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="48%"
                  outerRadius="72%"
                  paddingAngle={2}
                >
                  {contentArtifactsTotal.map((slice, i) => (
                    <Cell key={`artifact-${slice.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip labelClassName="text-slate-900 dark:text-white" />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5 xl:col-span-2">
        <header className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Document uploads by weekday</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{documentsByWeekdaySubtitle}</p>
          </div>
        </header>
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={documentsByWeekday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="dayShort" tick={{ fontSize: 11 }} className="text-slate-500" />
              <YAxis tick={{ fontSize: 11 }} className="text-slate-500" allowDecimals={false} />
              <Tooltip labelClassName="text-slate-900 dark:text-white" />
              <Bar dataKey="count" name="Documents" fill="#ea580c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5 xl:col-span-2">
        <header className="mb-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Documents created per day</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Trend window matches Growth trends below</p>
        </header>
        <div className="h-64 w-full min-w-0">
          {documentsTrend.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No document trend data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={documentsTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminDocsAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} className="text-slate-500" />
                <YAxis tick={{ fontSize: 10 }} className="text-slate-500" allowDecimals={false} />
                <Tooltip labelClassName="text-slate-900 dark:text-white" />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Documents"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill="url(#adminDocsAreaFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>
    </div>
  );
}
