"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/lib/api";
import type { DocumentListItem } from "@/types/document";
import { AttachFileSection } from "@/components/AttachFileSection";

function isProPlan(plan: string | undefined) {
  return plan?.toLowerCase() === "pro";
}

/** Matches server `FREE_LIMITS.ai_queries` for free plan display */
const FREE_AI_DAILY_QUERIES = 10;

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const isPro = isProPlan(user?.plan);
  const greetingName = user?.name?.trim() || user?.email?.split("@")[0] || "there";
  const [docTotal, setDocTotal] = useState<number | null>(null);
  const [recent, setRecent] = useState<DocumentListItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPick, setUploadPick] = useState<File | null>(null);

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

  const docLabel = docTotal === null ? "…" : String(docTotal);
  const aiQueriesLabel =
    user == null ? "…" : isPro ? String(user.ai_queries_today) : `${user.ai_queries_today} / ${FREE_AI_DAILY_QUERIES}`;
  const flashcardsLabel = user == null ? "…" : String(user.flashcards_generated);

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <header className="flex justify-between items-center mb-10 gap-4">
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-black tracking-tight">Welcome back, {greetingName}</h2>
          <p className="text-slate-500 dark:text-slate-400">Your workspace is synced and ready.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <UserMenu variant="header" />
        </motion.div>
      </header>

      <motion.section variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <span className="material-symbols-outlined">bolt</span>
            </div>
            <span className="rounded bg-slate-400/10 px-2 py-1 text-xs font-bold text-slate-400">Today</span>
          </div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">AI queries used today</h3>
          <p className="mt-1 text-3xl font-bold">{aiQueriesLabel}</p>
          {!isPro && user ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Free plan daily cap: {FREE_AI_DAILY_QUERIES}</p>
          ) : null}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <span className="material-symbols-outlined">description</span>
            </div>
            <span className="rounded bg-green-500/10 px-2 py-1 text-xs font-bold text-green-500">Live</span>
          </div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total documents</h3>
          <p className="mt-1 text-3xl font-bold">{docLabel}</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="material-symbols-outlined">style</span>
            </div>
            <span className="rounded bg-slate-400/10 px-2 py-1 text-xs font-bold text-slate-400">All time</span>
          </div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Flashcards generated</h3>
          <p className="mt-1 text-3xl font-bold">{flashcardsLabel}</p>
        </motion.div>
      </motion.section>

      <motion.section variants={itemVariants} className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            Create Document
          </Link>
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined" aria-hidden>
              folder_open
            </span>
            All documents
          </Link>
          {!isPro && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/35 text-sm font-bold text-amber-950 dark:text-amber-100 hover:bg-amber-100/90 dark:hover:bg-amber-950/55 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  upload
                </span>
                Upload PDF / DOCX
                <span className="text-xs font-bold uppercase tracking-wide opacity-90">Pro</span>
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
              description="Pick a file, then upload. Same panel as on the Documents page."
            />
            <button
              type="button"
              disabled={uploading || !uploadPick}
              onClick={() => void handleConfirmUpload()}
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                cloud_upload
              </span>
              {uploading ? "Uploading…" : "Upload document"}
            </button>
          </div>
        )}
      </motion.section>

      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Recent Documents</h3>
          <Link href="/documents" className="text-primary text-sm font-semibold hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm py-8">
            No documents yet.{" "}
            <Link href="/documents/new" className="text-primary font-semibold hover:underline">
              Create one
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0">
            {recent.map((doc) => (
              <li
                key={doc.id}
                className="bg-white dark:bg-slate-900 group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <Link href={`/documents/${doc.id}`} className="block p-5">
                  <h4 className="font-bold mb-1 truncate group-hover:text-primary transition-colors">{doc.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">
                    {doc.word_count.toLocaleString()} words · {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                  <p className="text-primary text-xs font-semibold">Open →</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  );
}
