"use client";

import { use } from "react";
import { Link } from "@/i18n/navigation";
import { AiGeneratingPanel } from "@/components/AiGeneratingPanel";
import { DocumentToolsTabs } from "@/components/DocumentToolsTabs";
import { Sidebar } from "@/components/Sidebar";
import { LearningPathView } from "@/components/learn/LearningPathView";
import { useLearningPathBundle } from "@/lib/useLearningPathBundle";

export default function DocumentLearnNodePage({
  params,
}: {
  params: Promise<{ id: string; nodeId: string }>;
}) {
  const { id, nodeId } = use(params);
  const { bundle, loading, error, load, updateBundle } = useLearningPathBundle(id);
  const docTitle = bundle?.documentTitle ?? "";
  const payload = bundle?.payload;

  if (loading && bundle === null) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="ml-64 flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl">
            <AiGeneratingPanel
              title="Loading your lesson..."
              description="Fetching this step and your learning path context."
            />
          </div>
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
          <Link href={`/documents/${id}/learn`} className="text-primary font-semibold hover:underline">
            Back to map
          </Link>
        </main>
      </div>
    );
  }

  const path = payload?.path;
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
                  href={`/documents/${id}/learn`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 font-semibold text-slate-700 transition-colors hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  <span className="material-symbols-outlined text-base" aria-hidden>
                    map
                  </span>
                  Back to map
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

              <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/85 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                <DocumentToolsTabs documentId={id} />
              </div>

              <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-600 dark:text-cyan-300">
                  Lesson view
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950 dark:text-white md:text-5xl">
                  Focus on one checkpoint at a time.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  {docTitle}
                </p>
              </header>
            </div>
          </section>

          <div className="mx-auto w-full max-w-5xl">
            {error ? (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            {!isReady ? (
              <section className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-8 shadow-[0_20px_60px_rgba(148,163,184,0.14)] backdrop-blur dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  This learning path is not ready yet. Go back to the map page to generate or retry it.
                </p>
              </section>
            ) : null}

            {isReady && payload ? (
              <LearningPathView
                documentId={id}
                documentTitle={docTitle}
                initialPayload={payload}
                onRefresh={load}
                onPayloadUpdate={(nextPayload) =>
                  updateBundle({
                    documentTitle: docTitle || "Untitled",
                    payload: nextPayload,
                  })
                }
                initialNodeId={nodeId}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
