"use client";

import { useCallback, useEffect, useState, use } from "react";
import { Link } from "@/i18n/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AiGeneratingPanel } from "@/components/AiGeneratingPanel";
import { DocumentFeatureHeader } from "@/components/DocumentFeatureHeader";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import type { DocumentDetail } from "@/types/document";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export default function DocumentSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [generatePending, setGeneratePending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "th">("en");

  const loadDoc = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get(`/api/documents/${id}`);
      setDoc(data.data as DocumentDetail);
    } catch {
      setLoadError("Document not found or you do not have access.");
      setDoc(null);
    }
  }, [id]);

  useEffect(() => {
    void loadDoc();
  }, [loadDoc]);

  async function handleGenerate(regenerate: boolean) {
    setActionError(null);
    setGeneratePending(true);
    try {
      const { data } = await api.post(`/api/documents/${id}/summary`, {
        language: lang,
        regenerate,
      });
      const row = data.data as {
        summary_text?: string;
        bullet_points?: unknown;
        key_concepts?: unknown;
      };
      setDoc((prev) =>
        prev
          ? {
              ...prev,
              summary_text: row.summary_text ?? prev.summary_text,
              bullet_points: row.bullet_points ?? prev.bullet_points,
              key_concepts: row.key_concepts ?? prev.key_concepts,
            }
          : prev
      );
      await loadDoc();
    } catch (err: unknown) {
      setActionError(extractApiError(err) || "Could not generate summary.");
    } finally {
      setGeneratePending(false);
    }
  }

  if (loadError || doc === null) {
    return (
      <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="ml-64 flex-1 p-8">
          {loadError ? (
            <p className="mb-4 text-red-600 dark:text-red-400" role="alert">
              {loadError}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">Loading…</p>
          )}
          <Link href="/documents" className="font-semibold text-primary hover:underline">
            ← Back to documents
          </Link>
        </main>
      </div>
    );
  }

  const hasSummary = Boolean(doc.summary_text && doc.summary_text.trim().length > 0);
  const bullets = asStringArray(doc.bullet_points);
  const concepts = asStringArray(doc.key_concepts);

  const langBlock = (
    <div className="min-w-[180px]">
      <label
        htmlFor="summary-output-lang"
        className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500"
      >
        Summary language
      </label>
      <select
        id="summary-output-lang"
        value={lang}
        onChange={(e) => setLang(e.target.value as "en" | "th")}
        disabled={generatePending}
        className="form-select-native mt-2"
      >
        <option value="en">English</option>
        <option value="th">Thai</option>
      </select>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <Sidebar />
      <main className="relative ml-64 flex flex-1 flex-col">
        <DocumentFeatureHeader documentId={id} title={doc.title} sectionLabel="AI summary" icon="summarize" />

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="mx-auto max-w-3xl">
            {generatePending ? (
              <AiGeneratingPanel
                title="Building your summary..."
                description="This can take up to a minute. Stay on this page while we read your document and draft takeaways and key concepts."
              />
            ) : (
              <>
                {actionError ? (
                  <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                    {actionError}
                  </p>
                ) : null}

                {!hasSummary ? (
                  <section
                    aria-labelledby="summary-empty-heading"
                    className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <h2 id="summary-empty-heading" className="text-lg font-black text-slate-900 dark:text-white">
                      No summary yet
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      Generate an AI summary with bullet takeaways and key concepts from your document text. This uses
                      one request from your daily AI quota. Choose the output language below (same idea as lesson
                      language on Learn).
                    </p>
                    <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                      {langBlock}
                      <button
                        type="button"
                        disabled={generatePending}
                        onClick={() => void handleGenerate(false)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-60 sm:self-end"
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden>
                          summarize
                        </span>
                        Generate summary
                      </button>
                    </div>
                  </section>
                ) : (
                  <article className="space-y-8 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
                    <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-700">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">Summary</h2>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Generated from document content
                        </p>
                      </div>
                      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                        {langBlock}
                        <button
                          type="button"
                          disabled={generatePending}
                          onClick={() => void handleGenerate(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <span className="material-symbols-outlined text-lg" aria-hidden>
                            refresh
                          </span>
                          Regenerate in selected language
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        Regenerating replaces the current summary and uses another AI request from your quota.
                      </p>
                    </header>
                    <section aria-labelledby="summary-body-heading">
                      <h3 id="summary-body-heading" className="sr-only">
                        Overview
                      </h3>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {doc.summary_text}
                      </p>
                    </section>

                    {bullets.length > 0 ? (
                      <section aria-labelledby="summary-bullets-heading">
                        <h3
                          id="summary-bullets-heading"
                          className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                        >
                          Takeaways
                        </h3>
                        <ul className="mt-3 list-none space-y-2 p-0">
                          {bullets.map((item, bulletIndex) => (
                            <li
                              key={`bullet-${bulletIndex}`}
                              className="flex gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
                            >
                              <span className="material-symbols-outlined shrink-0 text-primary text-lg" aria-hidden>
                                check_circle
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {concepts.length > 0 ? (
                      <section aria-labelledby="summary-concepts-heading">
                        <h3
                          id="summary-concepts-heading"
                          className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                        >
                          Key concepts
                        </h3>
                        <ul className="mt-3 flex flex-wrap gap-2 p-0 list-none">
                          {concepts.map((concept, conceptIndex) => (
                            <li
                              key={`concept-${conceptIndex}`}
                              className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary dark:border-primary/40 dark:bg-primary/10"
                            >
                              {concept}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </article>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
