"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { extractApiError } from "@/lib/extractApiError";
import type { LearningPathApiPayload } from "@/types/learning";
import { LearningPathView } from "@/components/learn/LearningPathView";

export default function DocumentLearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [docTitle, setDocTitle] = useState<string>("");
  const [payload, setPayload] = useState<LearningPathApiPayload | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genPending, setGenPending] = useState(false);
  const [lang, setLang] = useState<"en" | "th">("en");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const docRes = await api.get(`/api/documents/${id}`);
      const doc = docRes.data.data as { title?: string };
      setDocTitle(doc.title || "Untitled");

      const lpRes = await api.get(`/api/documents/${id}/learning-path`);
      setPayload(lpRes.data.data as LearningPathApiPayload);
    } catch {
      setError("Document not found or you do not have access.");
      setPayload(null);
      setDocTitle("");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const path = payload?.path;
    if (!path || path.status !== "generating") return;
    let active = true;
    const poll = async () => {
      try {
        const lpRes = await api.get(`/api/documents/${id}/learning-path`);
        const next = lpRes.data.data as LearningPathApiPayload;
        if (active) setPayload(next);
      } catch {
        /* ignore */
      }
    };
    const t = window.setInterval(() => void poll(), 4000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, [id, payload?.path]);

  async function generate(regenerate: boolean) {
    setGenPending(true);
    setError(null);
    try {
      const { data } = await api.post(
        `/api/documents/${id}/learning-path`,
        { language: lang, regenerate },
        { timeout: 30_000 }
      );
      const result = data.data as LearningPathApiPayload;
      setPayload(result);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const msg = extractApiError(e);
      if (status === 409) {
        setError(msg || "Generation already in progress. This page will update automatically.");
        try {
          const lpRes = await api.get(`/api/documents/${id}/learning-path`);
          setPayload(lpRes.data.data as LearningPathApiPayload);
        } catch {
          /* ignore */
        }
      } else {
        setError(msg || "Could not generate learning path.");
      }
    } finally {
      setGenPending(false);
    }
  }

  if (loading && payload === undefined) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="ml-64 flex flex-1 items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </main>
      </div>
    );
  }

  if (error && !docTitle) {
    return (
      <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          <p className="mb-4 text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
          <Link href="/documents" className="text-primary font-semibold hover:underline">
            Back to documents
          </Link>
        </main>
      </div>
    );
  }

  const path = payload?.path;
  const isGenerating = path?.status === "generating";
  const isError = path?.status === "error";
  const isReady = path?.status === "ready" && (payload?.nodes?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f5f7fb_42%,#eef2f8_100%)] font-display dark:bg-[radial-gradient(circle_at_top,#13203f_0%,#09101f_45%,#050914_100%)]">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto w-full max-w-6xl">
          <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(236,244,255,0.86))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.18)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(10,18,34,0.92),rgba(14,31,58,0.9))] dark:shadow-[0_30px_80px_rgba(2,6,23,0.5)] md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(49,94,251,0.16),transparent_24%)]" />
            <div className="relative">
              <nav className="mb-6 flex flex-wrap items-center gap-3 text-sm">
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-700 transition-colors hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    arrow_back
                  </span>
                  Documents
                </Link>
                <Link
                  href={`/documents/${id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-700 transition-colors hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    edit_square
                  </span>
                  Edit source
                </Link>
              </nav>

              <header className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-300">
                    Learning workspace
                  </p>
                  <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">
                    Learn with structure, not just scroll.
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                    {docTitle}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                      Lesson flow
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Guided sequence with progress, completion, and chat support.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                      Lighter lessons
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Visual blocks are simplified to focus on meaning, not ornament.
                    </p>
                  </div>
                </div>
              </header>
            </div>
          </section>

          <div className="mx-auto w-full max-w-5xl">
            {error ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            {(!path || (!isReady && !isGenerating && !isError)) && !genPending ? (
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(148,163,184,0.14)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">
                      Generate path
                    </p>
                    <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
                      Create your learning path
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      We will analyze your document and build a step-by-step lesson with explanations, lighter
                      visual summaries, checks for understanding, flashcards, and a recap. One generation uses
                      one AI request from your daily quota.
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-slate-950/35">
                    <label
                      htmlFor="learn-lang"
                      className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500"
                    >
                      Lesson language
                    </label>
                    <select
                      id="learn-lang"
                      value={lang}
                      onChange={(e) => setLang(e.target.value as "en" | "th")}
                      className="form-select-native mt-3"
                    >
                      <option value="en">English</option>
                      <option value="th">Thai</option>
                    </select>

                    <button
                      type="button"
                      disabled={genPending}
                      onClick={() => void generate(false)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-bold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      <span className="material-symbols-outlined" aria-hidden>
                        auto_stories
                      </span>
                      {genPending ? "Generating..." : "Generate learning path"}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {isGenerating || genPending ? (
              <section className="rounded-[2rem] border border-cyan-200/70 bg-[linear-gradient(135deg,rgba(236,254,255,0.95),rgba(239,246,255,0.92))] p-8 text-center shadow-[0_18px_50px_rgba(125,211,252,0.16)] dark:border-cyan-400/20 dark:bg-[linear-gradient(135deg,rgba(8,28,36,0.9),rgba(11,18,34,0.92))]">
                <p className="text-lg font-black text-slate-900 dark:text-white">Building your lessons...</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  This can take up to a minute. The page refreshes automatically while your learning structure
                  is being prepared.
                </p>
                <div className="flex justify-center gap-2 pt-5" aria-hidden>
                  <span className="size-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="size-2.5 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
                  <span className="size-2.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                </div>
                {!genPending ? (
                  <button
                    type="button"
                    onClick={() => void generate(true)}
                    className="mt-5 text-xs font-semibold text-slate-500 underline-offset-2 transition-colors hover:text-primary hover:underline"
                  >
                    Taking too long? Try again
                  </button>
                ) : null}
              </section>
            ) : null}

            {isError ? (
              <section className="rounded-[2rem] border border-red-200 bg-red-50/90 p-8 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
                <p className="font-bold text-red-800 dark:text-red-200">Could not build lessons</p>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {path?.error_message || "Unknown error."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={genPending}
                    onClick={() => void generate(true)}
                    className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    Try again
                  </button>
                </div>
              </section>
            ) : null}

            {isReady && payload ? (
              <>
                <div className="mb-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={genPending || isGenerating}
                    onClick={() => void generate(true)}
                    className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:text-primary disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                  >
                    Regenerate path
                  </button>
                </div>
                <LearningPathView
                  documentId={id}
                  documentTitle={docTitle}
                  initialPayload={payload}
                  onRefresh={load}
                />
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
