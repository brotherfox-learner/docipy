"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/lib/api";
import type { DocumentListItem } from "@/types/document";
import type { LearningDashboardStats } from "@/types/learning";
import { getLevelFromTotalXp, getXpProgressInCurrentLevel } from "@/lib/learning-level";
import { AttachFileSection } from "@/components/AttachFileSection";

function isProPlan(plan: string | undefined) {
  return plan?.toLowerCase() === "pro";
}

const FREE_AI_DAILY_QUERIES = 10;

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user, refreshUser } = useAuth();
  const isPro = isProPlan(user?.plan);
  const greetingName = user?.name?.trim() || user?.email?.split("@")[0] || t("guestName");
  const [docTotal, setDocTotal] = useState<number | null>(null);
  const [recent, setRecent] = useState<DocumentListItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPick, setUploadPick] = useState<File | null>(null);
  const [learnStats, setLearnStats] = useState<LearningDashboardStats | null>(null);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/documents", { params: { limit: 6, page: 1 } });
        if (!cancelled) {
          setDocTotal(data.data.total);
          setRecent(data.data.documents);
        }
      } catch {
        if (!cancelled) {
          setDocTotal(0);
          setRecent([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/learning/dashboard-stats");
        if (!cancelled) {
          setLearnStats(data.data as LearningDashboardStats);
        }
      } catch {
        if (!cancelled) setLearnStats(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirmUpload() {
    const file = uploadPick;
    if (!file || !isPro) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post("/api/documents/upload", body, { timeout: 120_000 });
      setUploadPick(null);
      const { data } = await api.get("/api/documents", { params: { limit: 6, page: 1 } });
      setDocTotal(data.data.total);
      setRecent(data.data.documents);
    } catch {
      /* optional: toast */
    } finally {
      setUploading(false);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const docLabel = docTotal === null ? "..." : String(docTotal);
  const aiQueriesLabel =
    user == null ? "..." : isPro ? String(user.ai_queries_today) : `${user.ai_queries_today} / ${FREE_AI_DAILY_QUERIES}`;
  const flashcardsLabel = user == null ? "..." : String(user.flashcards_generated);

  const learnLevel = learnStats ? getLevelFromTotalXp(learnStats.total_xp) : 1;
  const learnXpBar = learnStats ? getXpProgressInCurrentLevel(learnStats.total_xp) : null;

  const statCards = [
    {
      title: t("statAiTitle"),
      value: aiQueriesLabel,
      note: !isPro && user ? t("statAiNote", { cap: FREE_AI_DAILY_QUERIES }) : undefined,
      iconWrap: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      icon: "bolt",
      badge: t("badgeToday"),
      badgeClass: "bg-slate-400/10 text-slate-400",
    },
    {
      title: t("statDocTitle"),
      value: docLabel,
      iconWrap: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
      icon: "description",
      badge: t("badgeLive"),
      badgeClass: "bg-green-500/10 text-green-500",
    },
    {
      title: t("statFlashTitle"),
      value: flashcardsLabel,
      iconWrap: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      icon: "style",
      badge: t("badgeAllTime"),
      badgeClass: "bg-slate-400/10 text-slate-400",
    },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <header className="mb-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(237,244,255,0.9))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(9,14,25,0.96),rgba(14,28,52,0.92))] dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)] md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <motion.div variants={itemVariants} className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-300">
              {t("commandCenter")}
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white">
              {t("welcomeBack", { name: greetingName })}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{t("heroBody")}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              className="rounded-full border border-slate-200/80 bg-white/80 p-2 text-slate-600 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              aria-label={t("notificationsAria")}
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <UserMenu variant="header" />
          </motion.div>
        </div>
      </header>

      <motion.section variants={containerVariants} className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {statCards.map((card) => (
          <motion.div
            key={card.title}
            variants={itemVariants}
            className="rounded-[1.75rem] border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_45px_rgba(148,163,184,0.12)] transition-shadow hover:shadow-[0_24px_55px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className={`rounded-2xl p-2.5 ${card.iconWrap}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${card.badgeClass}`}>
                {card.badge}
              </span>
            </div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</h3>
            <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
              {card.value}
            </p>
            {card.note ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{card.note}</p>
            ) : null}
          </motion.div>
        ))}
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="mb-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("learningTitle")}</h3>
          <Link href="/documents" className="text-sm font-semibold text-primary hover:underline">
            {t("openDocToLearn")}
          </Link>
        </div>
        {learnStats ? (
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-slate-950/35">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" aria-hidden>
                  military_tech
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white">{t("xpTitle")}</h4>
              </div>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{t("xpBody")}</p>
              {learnXpBar ? (
                <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>{t("levelN", { level: learnLevel })}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">
                      {t("xpTowardLevel", {
                        current: learnXpBar.xpIntoLevel,
                        next: learnLevel + 1,
                      })}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#6366f1_100%)] transition-[width] duration-300"
                      style={{ width: `${learnXpBar.percentInLevel}%` }}
                    />
                  </div>
                  {learnStats.total_xp > 0 && learnXpBar.xpIntoLevel === 0 ? (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {t("xpStartLevel", { level: learnLevel, next: learnLevel + 1 })}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {t("xpUntilNext", { amount: learnXpBar.xpToNextLevel, next: learnLevel + 1 })}
                    </p>
                  )}
                </div>
              ) : null}
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t("totalXpLabel")}</dt>
                  <dd className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                    {learnStats.total_xp}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t("levelLabel")}</dt>
                  <dd className="text-2xl font-black tabular-nums text-primary">{learnLevel}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t("bestStreakLabel")}</dt>
                  <dd className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {t("bestStreakDays", { n: learnStats.best_streak })}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">{t("stepsCompletedLabel")}</dt>
                  <dd className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {learnStats.nodes_completed}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-slate-950/35">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500" aria-hidden>
                  workspace_premium
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white">{t("achievementsTitle")}</h4>
              </div>
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t("achievementsBody")}</p>
              <ul className="m-0 list-none space-y-3 p-0">
                <li
                  className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center ${
                    learnStats.nodes_completed >= 1
                      ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/25"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="material-symbols-outlined shrink-0 text-emerald-600 dark:text-emerald-400"
                      aria-hidden
                    >
                      directions_walk
                    </span>
                    <span className="font-semibold">{t("firstStep")}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 sm:ml-auto sm:text-right">
                    {learnStats.nodes_completed >= 1
                      ? t("unlocked")
                      : t("progressNodes", { current: learnStats.nodes_completed })}
                  </span>
                </li>
                <li
                  className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center ${
                    learnStats.best_streak >= 3
                      ? "border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/25"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="material-symbols-outlined shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    >
                      local_fire_department
                    </span>
                    <span className="font-semibold">{t("onFire")}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 sm:ml-auto sm:text-right">
                    {learnStats.best_streak >= 3
                      ? t("unlocked")
                      : t("progressStreak", { current: Math.min(learnStats.best_streak, 3) })}
                  </span>
                </li>
                <li
                  className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center ${
                    learnStats.total_xp >= 150
                      ? "border-violet-200 bg-violet-50/80 dark:border-violet-900/40 dark:bg-violet-950/25"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className="material-symbols-outlined shrink-0 text-violet-600 dark:text-violet-400"
                      aria-hidden
                    >
                      menu_book
                    </span>
                    <span className="font-semibold">{t("scholar")}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 sm:ml-auto sm:text-right">
                    {learnStats.total_xp >= 150
                      ? t("unlocked")
                      : t("progressXp", { current: Math.min(learnStats.total_xp, 150) })}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">{t("learningEmpty")}</p>
        )}
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="mb-10 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("quickActions")}</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-bold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <span className="material-symbols-outlined">add</span>
            {t("createDocument")}
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            <span className="material-symbols-outlined" aria-hidden>
              folder_open
            </span>
            {t("allDocuments")}
          </Link>
          {!isPro && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-6 py-3 text-sm font-bold text-amber-950 transition-colors hover:bg-amber-100/90 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100 dark:hover:bg-amber-950/55"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  upload
                </span>
                {t("uploadProCta")}
                <span className="text-xs font-bold uppercase tracking-wide opacity-90">{t("proBadge")}</span>
              </Link>
            </div>
          )}
        </div>
        {isPro && (
          <div className="mt-6 max-w-xl">
            <AttachFileSection
              file={uploadPick}
              onFileChange={setUploadPick}
              disabled={uploading}
              description={t("dashboardUploadDesc")}
            />
            <button
              type="button"
              disabled={uploading || !uploadPick}
              onClick={() => void handleConfirmUpload()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-2.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                cloud_upload
              </span>
              {uploading ? t("uploading") : t("uploadDocument")}
            </button>
          </div>
        )}
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.14)] dark:border-white/10 dark:bg-white/5 dark:shadow-none"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("recentDocs")}</h3>
          <Link href="/documents" className="text-sm font-semibold text-primary hover:underline">
            {t("viewAll")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-sm text-slate-500 dark:text-slate-400">
            {t("noDocs")}{" "}
            <Link href="/documents/new" className="font-semibold text-primary hover:underline">
              {t("createOne")}
            </Link>
            .
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((doc) => (
              <li
                key={doc.id}
                className="group overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 transition-all hover:shadow-[0_18px_45px_rgba(148,163,184,0.18)] dark:border-white/10 dark:bg-slate-950/35"
              >
                <div className="p-5">
                  <Link href={`/documents/${doc.id}`} className="block">
                    <h4 className="mb-1 truncate font-bold transition-colors group-hover:text-primary">
                      {doc.title}
                    </h4>
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                      {t("docMeta", {
                        words: doc.word_count.toLocaleString(),
                        date: new Date(doc.updated_at).toLocaleDateString(),
                      })}
                    </p>
                    <p className="text-xs font-semibold text-primary">{t("openArrow")}</p>
                  </Link>
                  <Link
                    href={`/documents/${doc.id}/learn`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-primary dark:text-slate-400"
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden>
                      school
                    </span>
                    {t("learnCta")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  );
}
