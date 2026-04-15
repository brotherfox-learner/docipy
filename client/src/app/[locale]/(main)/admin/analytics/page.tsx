"use client";

import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/UserMenu";
import { extractApiError } from "@/lib/extractApiError";
import type { TrendDayRow } from "./TrendsChartsClient";

const TrendsChartsClient = dynamic(() => import("./TrendsChartsClient"), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading trend chart…</p>
  ),
});

const FeatureChartsClient = dynamic(() => import("./FeatureChartsClient"), {
  ssr: false,
  loading: () => (
    <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">Loading feature charts…</p>
  ),
});

const AnalyticsVisualChartsClient = dynamic(() => import("./AnalyticsVisualChartsClient"), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading charts…</p>
  ),
});

function mergeTrendRows(
  newUsers: { day: string; count: number }[],
  activeUsers: { day: string; count: number }[],
  documentsCreated: { day: string; count: number }[]
): TrendDayRow[] {
  const map = new Map<string, TrendDayRow>();
  const ensure = (day: string): TrendDayRow => {
    let row = map.get(day);
    if (!row) {
      row = { day, newUsers: 0, activeUsers: 0, documentsCreated: 0 };
      map.set(day, row);
    }
    return row;
  };
  for (const r of newUsers) {
    ensure(r.day).newUsers = r.count;
  }
  for (const r of activeUsers) {
    ensure(r.day).activeUsers = r.count;
  }
  for (const r of documentsCreated) {
    ensure(r.day).documentsCreated = r.count;
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

function PctChange({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        No prior-period baseline (previous window was 0)
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span
      className={`text-xs font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
    >
      {positive ? "+" : ""}
      {value}% vs previous period
    </span>
  );
}

type AnalyticsWindowDto = { type: "all" } | { type: "rolling"; days: number };

function analyticsWindowLabel(w: AnalyticsWindowDto): string {
  if (w.type === "all") return "All time";
  const n = w.days;
  return `${n} day${n === 1 ? "" : "s"}`;
}

function documentsWeekdayChartSubtitle(w: AnalyticsWindowDto): string {
  if (w.type === "all") return "All time, UTC";
  const n = w.days;
  return `Last ${n} day${n === 1 ? "" : "s"}, UTC`;
}

type PeriodComparisonMetric = {
  current: number;
  previous: number;
  /** `null` when the prior window was 0 — a percent vs zero is not meaningful (API no longer uses fake +100%). */
  changePercent: number | null;
};

type OverviewData = {
  analyticsWindow: AnalyticsWindowDto;
  totalUsers: number;
  dau: number;
  mau: number;
  totalDocuments: number;
  documentsCreatedToday: number;
  activeProSubscriptions: number;
  mrrMonthlyUsdEstimate: number;
  mrrPriceAssumptionUsd: number;
  proUsers: number;
  conversionRatePercent: number;
  periodComparison: {
    windowDays: number;
    periodLabel: string;
    newSignups: PeriodComparisonMetric;
    documentsCreated: PeriodComparisonMetric;
    distinctLoginUsers: PeriodComparisonMetric;
    aiChatMessages: PeriodComparisonMetric;
  } | null;
  planDistribution: { plan: string; count: number }[];
};

type VisualizationsData = {
  analyticsWindow: AnalyticsWindowDto;
  documentsByWeekday: { dayShort: string; dayIndex: number; count: number }[];
  contentArtifactsTotal: { name: string; value: number }[];
  weekdayNote: string;
};

type TrendsData = {
  analyticsWindow: AnalyticsWindowDto;
  days: number | null;
  newUsersByDay: { day: string; count: number }[];
  activeUsersByDay: { day: string; count: number }[];
  documentsCreatedByDay: { day: string; count: number }[];
  changeVsPreviousWindow: {
    newUsersPercent: number | null;
    activeUsersPercent: number | null;
    documentsCreatedPercent: number | null;
  } | null;
};

type UsersData = {
  avgDocumentsPerUser: number;
  avgLoginsPerUser: number;
  topActiveUsers: {
    id: string;
    email: string;
    name: string | null;
    documentsCount: number;
    aiQueriesCount: number;
    learningXpTotal: number;
    activityScore: number;
  }[];
};

type DocumentsData = {
  topByAiQueries: {
    documentId: string;
    title: string;
    userId: string;
    ownerEmail: string;
    aiQueriesCount: number;
  }[];
  topByWordCount: {
    documentId: string;
    title: string;
    userId: string;
    ownerEmail: string;
    wordCount: number;
  }[];
  totals: { aiQueries: number; summaries: number; quizzes: number; flashcards: number };
  documentsWithZeroActivity: number;
  avgWordCount: number;
};

type BusinessData = {
  activeProSubscriptions: number;
  mrrMonthlyUsdEstimate: number;
  mrrPriceAssumptionUsd: number;
  subscriptionsCanceledCount: number;
  churnRatePercent: number;
  proSubscriptionsCreatedLast30Days: number;
  usageByPlan: {
    plan: string;
    userCount: number;
    avgDocumentsPerUser: number;
    avgAiQueriesLifetimePerUser: number;
  }[];
};

type FeaturesData = {
  analyticsWindow: AnalyticsWindowDto;
  days: number | null;
  totalActiveUsers: number;
  features: {
    key: string;
    label: string;
    totalUses: number;
    distinctUsers: number;
    adoptionRatePercent: number;
    usesByDay: { day: string; count: number }[];
  }[];
};

type RangePreset = "1" | "7" | "30" | "365" | "all";

type AnalyticsMainTab = "summary" | "charts" | "details";

const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "1", label: "Last 1 day" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
];

export default function AdminAnalyticsPage() {
  const { user, isLoadingSession } = useAuth();
  const router = useRouter();
  const [rangePreset, setRangePreset] = useState<RangePreset>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [visualizations, setVisualizations] = useState<VisualizationsData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [usersBlock, setUsersBlock] = useState<UsersData | null>(null);
  const [documentsBlock, setDocumentsBlock] = useState<DocumentsData | null>(null);
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [features, setFeatures] = useState<FeaturesData | null>(null);
  const [mainTab, setMainTab] = useState<AnalyticsMainTab>("summary");

  const daysQuery = rangePreset === "all" ? "all" : rangePreset;

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const q = `days=${encodeURIComponent(daysQuery)}`;
      const [o, v, t, u, d, b, f] = await Promise.all([
        api.get<{ data: OverviewData }>(`/api/admin/analytics/overview?${q}`),
        api.get<{ data: VisualizationsData }>(`/api/admin/analytics/visualizations?${q}`),
        api.get<{ data: TrendsData }>(`/api/admin/analytics/trends?${q}`),
        api.get<{ data: UsersData }>("/api/admin/analytics/users"),
        api.get<{ data: DocumentsData }>("/api/admin/analytics/documents"),
        api.get<{ data: BusinessData }>("/api/admin/analytics/business"),
        api.get<{ data: FeaturesData }>(`/api/admin/analytics/features?${q}`),
      ]);
      setOverview(o.data.data);
      setVisualizations(v.data.data);
      setTrends(t.data.data);
      setUsersBlock(u.data.data);
      setDocumentsBlock(d.data.data);
      setBusiness(b.data.data);
      setFeatures(f.data.data);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setError(extractApiError(err) || "Could not load analytics.");
      if (status === 403 || status === 401) {
        router.replace("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [router, daysQuery]);

  useEffect(() => {
    if (isLoadingSession) return;
    if (user && !user.is_admin) {
      router.replace("/dashboard");
      return;
    }
    void load();
  }, [isLoadingSession, user, load, router]);

  const cardClass =
    "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5";
  const sectionClass = "mb-10 space-y-4";
  const h2Class = "text-lg font-bold text-slate-900 dark:text-white";

  if (isLoadingSession || (loading && !error)) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8" aria-busy="true">
        <p className="text-slate-500 dark:text-slate-400">Loading analytics…</p>
      </section>
    );
  }

  if (
    error ||
    !overview ||
    !visualizations ||
    !trends ||
    !usersBlock ||
    !documentsBlock ||
    !business ||
    !features
  ) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <p className="mb-4 text-red-700 dark:text-red-300" role="alert">
          {error || "Could not load analytics."}
        </p>
        <Link href="/admin" className="font-semibold text-primary hover:underline">
          ← Back to admin
        </Link>
      </section>
    );
  }

  const mergedTrends = mergeTrendRows(
    trends.newUsersByDay,
    trends.activeUsersByDay,
    trends.documentsCreatedByDay
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-7xl px-4 py-8"
    >
      <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <Link href="/admin" className="font-semibold text-primary hover:underline">
              Admin
            </Link>
            <span aria-hidden> / </span>
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Admin analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Signed in as {user?.email}. DAU / MAU use refresh-token creation as a login proxy.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="admin-analytics-range" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Reporting period
            </label>
            <select
              id="admin-analytics-range"
              className="form-select-native min-w-44 shadow-sm"
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as RangePreset)}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <UserMenu variant="header" />
        </div>
      </header>

      <nav
        className="mb-8 border-b border-slate-200 dark:border-slate-700"
        aria-label="Analytics report sections"
      >
        <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
          {(
            [
              { id: "summary" as const, label: "Summary" },
              { id: "charts" as const, label: "Charts" },
              { id: "details" as const, label: "Details" },
            ] as const
          ).map((t) => {
            const selected = mainTab === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  id={`admin-analytics-tab-${t.id}`}
                  aria-controls={`admin-analytics-panel-${t.id}`}
                  onClick={() => setMainTab(t.id)}
                  className={`relative -mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
                    selected
                      ? "border-primary text-slate-900 dark:text-white"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {mainTab === "summary" ? (
        <div
          id="admin-analytics-panel-summary"
          role="tabpanel"
          aria-labelledby="admin-analytics-tab-summary"
          className="flex flex-col gap-10"
        >
      <section aria-labelledby="analytics-comparison-heading" className={sectionClass}>
        <h2 id="analytics-comparison-heading" className={h2Class}>
          Period comparison
        </h2>
        {overview.periodComparison ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">{overview.periodComparison.periodLabel}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  {
                    label: "New signups",
                    m: overview.periodComparison.newSignups,
                  },
                  {
                    label: "Documents created",
                    m: overview.periodComparison.documentsCreated,
                  },
                  {
                    label: "Distinct users (logins)",
                    m: overview.periodComparison.distinctLoginUsers,
                  },
                  {
                    label: "AI chat messages",
                    m: overview.periodComparison.aiChatMessages,
                  },
                ] as const
              ).map(({ label, m }) => {
                const wd = overview.periodComparison!.windowDays;
                const pct = m.changePercent;
                const up = pct !== null && pct >= 0;
                return (
                  <article key={label} className={cardClass}>
                    <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</h3>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                      {m.current.toLocaleString()}
                    </p>
                    {pct === null ? (
                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        No % change — prior {wd}-day window was 0 (any current activity is new vs that baseline).
                      </p>
                    ) : (
                      <p
                        className={`mt-1 text-xs font-bold tabular-nums ${up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        <span aria-hidden>{up ? "↑ " : "↓ "}</span>
                        {up ? "+" : ""}
                        {pct}% from prior {wd} day{wd === 1 ? "" : "s"}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      Prior window: {m.previous.toLocaleString()}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Period-over-period cards apply to fixed rolling windows only. Choose 1 day through 1 year above; &quot;All
            time&quot; hides this block because there is no paired prior window.
          </p>
        )}
      </section>

      <section aria-labelledby="analytics-overview-heading" className={sectionClass}>
        <h2 id="analytics-overview-heading" className={h2Class}>
          At a glance
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          {[
            { label: "Total users (active)", value: overview.totalUsers },
            { label: "DAU (logins today, UTC)", value: overview.dau },
            { label: "MAU (30d logins)", value: overview.mau },
            { label: "Documents", value: overview.totalDocuments },
            { label: "Docs created today (UTC)", value: overview.documentsCreatedToday },
            {
              label: `Est. MRR (@ $${overview.mrrPriceAssumptionUsd}/mo)`,
              value: `$${overview.mrrMonthlyUsdEstimate.toLocaleString()}`,
            },
            { label: "Free→Pro conversion %", value: `${overview.conversionRatePercent}%` },
          ].map((s) => (
            <article key={s.label} className={cardClass}>
              <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</h3>
              <p className="mt-1 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="analytics-summary-content-heading" className={sectionClass}>
        <h2 id="analytics-summary-content-heading" className={h2Class}>
          Generated content snapshot
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{visualizations.weekdayNote}</p>
        <article className={cardClass}>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Artifact counts (reporting window)</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Same categories as the Charts tab pie: summaries, learn paths, quizzes, flashcards, knowledge graphs, and
            AI messages. Counts follow your reporting period above; categories with zero uses are hidden here and in the
            chart.
          </p>
          {visualizations.contentArtifactsTotal.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No generated artifacts in this period.</p>
          ) : (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visualizations.contentArtifactsTotal.map((row) => (
                <div
                  key={row.name}
                  className="flex items-baseline justify-between gap-3 rounded-xl border border-slate-200/80 px-4 py-3 dark:border-slate-700"
                >
                  <dt className="text-sm font-medium text-slate-600 dark:text-slate-300">{row.name}</dt>
                  <dd className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
                    {row.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </article>
      </section>
        </div>
      ) : null}

      {mainTab === "charts" ? (
        <div
          id="admin-analytics-panel-charts"
          role="tabpanel"
          aria-labelledby="admin-analytics-tab-charts"
          className="flex flex-col gap-10"
        >
      <section aria-labelledby="analytics-visual-heading" className={sectionClass}>
        <h2 id="analytics-visual-heading" className={h2Class}>
          Visual overview
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{visualizations.weekdayNote}</p>
        <AnalyticsVisualChartsClient
          planDistribution={overview.planDistribution}
          documentsByWeekday={visualizations.documentsByWeekday}
          documentsByWeekdaySubtitle={documentsWeekdayChartSubtitle(visualizations.analyticsWindow)}
          contentArtifactsTotal={visualizations.contentArtifactsTotal}
          documentsTrend={trends.documentsCreatedByDay}
        />
      </section>

      <section aria-labelledby="analytics-trends-heading" className={sectionClass}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="analytics-trends-heading" className={h2Class}>
            Growth trends ({analyticsWindowLabel(trends.analyticsWindow)})
          </h2>
          {trends.changeVsPreviousWindow ? (
            <ul className="m-0 flex list-none flex-wrap gap-4 p-0 text-slate-600 dark:text-slate-300">
              <li className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">New users</span>
                <PctChange value={trends.changeVsPreviousWindow.newUsersPercent} />
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active users</span>
                <PctChange value={trends.changeVsPreviousWindow.activeUsersPercent} />
              </li>
              <li className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Documents</span>
                <PctChange value={trends.changeVsPreviousWindow.documentsCreatedPercent} />
              </li>
            </ul>
          ) : (
            <p className="m-0 text-xs text-slate-500 dark:text-slate-400">No prior-window comparison for all time.</p>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          When a rolling window is selected, these percents compare this window to the immediately previous window of
          the same length. Period comparison cards above use the same day counts as your reporting period.
        </p>
        <article className={cardClass}>
          <TrendsChartsClient data={mergedTrends} />
        </article>
      </section>
        </div>
      ) : null}

      {mainTab === "details" ? (
        <div
          id="admin-analytics-panel-details"
          role="tabpanel"
          aria-labelledby="admin-analytics-tab-details"
          className="flex flex-col gap-10"
        >
      <section aria-labelledby="analytics-users-heading" className={sectionClass}>
        <h2 id="analytics-users-heading" className={h2Class}>
          User activity
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className={cardClass}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg documents per user</h3>
            <p className="mt-1 text-3xl font-black tabular-nums">{usersBlock.avgDocumentsPerUser}</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg logins per user</h3>
            <p className="mt-1 text-3xl font-black tabular-nums">{usersBlock.avgLoginsPerUser}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Total refresh tokens ÷ active users</p>
          </article>
        </div>
        <article className={`${cardClass} overflow-x-auto`}>
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Top active users</h3>
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Top users by composite activity score</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">User</th>
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Docs</th>
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">AI queries</th>
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Learning XP</th>
                <th className="pb-2 font-semibold text-slate-500 dark:text-slate-400">Score</th>
              </tr>
            </thead>
            <tbody>
              {usersBlock.topActiveUsers.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.name?.trim() || row.email}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{row.email}</p>
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{row.documentsCount}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.aiQueriesCount}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.learningXpTotal}</td>
                  <td className="py-2 tabular-nums">{row.activityScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section aria-labelledby="analytics-docs-heading" className={sectionClass}>
        <h2 id="analytics-docs-heading" className={h2Class}>
          Document insights
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">AI queries (all time)</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">{documentsBlock.totals.aiQueries}</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Summaries</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">{documentsBlock.totals.summaries}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Rows in the summaries table (per-document generated summaries).
            </p>
          </article>
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Quizzes</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">{documentsBlock.totals.quizzes}</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Flashcards</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">{documentsBlock.totals.flashcards}</p>
          </article>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className={cardClass}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg word count / document</h3>
            <p className="mt-1 text-3xl font-black tabular-nums">{documentsBlock.avgWordCount}</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Documents with zero activity</h3>
            <p className="mt-1 text-3xl font-black tabular-nums">
              {documentsBlock.documentsWithZeroActivity}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              No AI, summary, quiz, or flashcards on document
            </p>
          </article>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className={cardClass}>
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Top by AI chat usage</h3>
            <ul className="m-0 list-none space-y-2 p-0 text-sm">
              {documentsBlock.topByAiQueries.map((d) => (
                <li key={d.documentId} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="min-w-0 font-medium text-slate-800 dark:text-slate-200">{d.title}</span>
                  <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
                    {d.aiQueriesCount} · {d.ownerEmail}
                  </span>
                </li>
              ))}
            </ul>
          </article>
          <article className={cardClass}>
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Top by word count</h3>
            <ul className="m-0 list-none space-y-2 p-0 text-sm">
              {documentsBlock.topByWordCount.map((d) => (
                <li key={d.documentId} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="min-w-0 font-medium text-slate-800 dark:text-slate-200">{d.title}</span>
                  <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
                    {d.wordCount.toLocaleString()} words · {d.ownerEmail}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section aria-labelledby="analytics-business-heading" className={sectionClass}>
        <h2 id="analytics-business-heading" className={h2Class}>
          Business
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Pro subscriptions</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">{business.activeProSubscriptions}</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Est. MRR (USD)</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">${business.mrrMonthlyUsdEstimate}</p>
            <p className="mt-1 text-xs text-slate-500">Assumes ${business.mrrPriceAssumptionUsd}/seat/mo</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Churn (canceled / all subs)</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">{business.churnRatePercent}%</p>
            <p className="mt-1 text-xs text-slate-500">Canceled rows: {business.subscriptionsCanceledCount}</p>
          </article>
          <article className={cardClass}>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400">Pro rows created (30d)</h3>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {business.proSubscriptionsCreatedLast30Days}
            </p>
          </article>
        </div>
        <article className={`${cardClass} overflow-x-auto`}>
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Usage by plan</h3>
          <table className="w-full min-w-[480px] text-sm">
            <caption className="sr-only">Average usage metrics grouped by user plan</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Plan</th>
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Users</th>
                <th className="pb-2 pr-4 font-semibold text-slate-500 dark:text-slate-400">Avg docs / user</th>
                <th className="pb-2 font-semibold text-slate-500 dark:text-slate-400">Avg AI queries / user</th>
              </tr>
            </thead>
            <tbody>
              {business.usageByPlan.map((row) => (
                <tr key={row.plan} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4 font-medium capitalize">{row.plan}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.userCount}</td>
                  <td className="py-2 pr-4 tabular-nums">{row.avgDocumentsPerUser}</td>
                  <td className="py-2 tabular-nums">{row.avgAiQueriesLifetimePerUser}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>

      <section aria-labelledby="analytics-features-heading" className={sectionClass}>
        <h2 id="analytics-features-heading" className={h2Class}>
          Feature usage ({analyticsWindowLabel(features.analyticsWindow)})
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Totals and distinct users are scoped to the reporting period. Adoption = distinct users who used the feature
          in this period ÷ all active users on the platform ({features.totalActiveUsers}). Flashcard totals use distinct
          documents that had cards created in the period (not each physical card), so totals align with deck usage per
          document.
        </p>
        <ul className="m-0 mb-6 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {features.features.map((feat) => (
            <li key={feat.key} className={cardClass}>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{feat.label}</h3>
              <dl className="mt-2 grid gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Total uses</dt>
                  <dd className="font-semibold tabular-nums">{feat.totalUses.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Distinct users</dt>
                  <dd className="font-semibold tabular-nums">{feat.distinctUsers.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500 dark:text-slate-400">Adoption %</dt>
                  <dd className="font-semibold tabular-nums">{feat.adoptionRatePercent}%</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        <FeatureChartsClient features={features.features} />
      </section>
        </div>
      ) : null}
    </motion.div>
  );
}
