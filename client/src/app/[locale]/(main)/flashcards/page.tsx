"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { DocumentListItem } from "@/types/document";
import { extractApiError } from "@/lib/extractApiError";

function flashcardCount(doc: DocumentListItem): number {
  const raw = doc.flashcard_count;
  if (raw === undefined || raw === null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export default function FlashcardsHubPage() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const { data } = await api.get("/api/documents", { params: { limit: 100, page: 1 } });
      setDocuments(data.data.documents);
    } catch (err) {
      setDocuments([]);
      setError(extractApiError(err) || "Could not load documents.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withDecks = useMemo(
    () => documents.filter((d) => flashcardCount(d) > 0),
    [documents]
  );

  return (
    <section className="max-w-6xl">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Flashcards</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Open a document deck to study, or generate cards from any document.
          </p>
        </div>
        <Link
          href="/documents"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            description
          </span>
          All documents
        </Link>
      </header>

      {error ? (
        <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="py-16 text-center text-slate-500 dark:text-slate-400">Loading…</p>
      ) : withDecks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-3xl" aria-hidden>
              style
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">No flashcard decks yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Open a document, then use <strong className="font-semibold text-slate-700 dark:text-slate-300">Generate flashcards</strong> on the flashcard
            page for that document. Decks you create will show up here.
          </p>
          <Link
            href="/documents"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            Go to documents
          </Link>
        </div>
      ) : (
        <ul className="m-0 grid auto-rows-fr list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {withDecks.map((doc) => {
            const n = flashcardCount(doc);
            return (
              <li key={doc.id} className="flex min-h-0">
                <article className="flex h-full w-full min-h-44 flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-900 wrap-break-word dark:text-white">
                    {doc.title}
                  </h2>
                  <p className="mt-2 shrink-0 text-sm text-slate-500 dark:text-slate-400">
                    {n} card{n !== 1 ? "s" : ""} · {doc.word_count.toLocaleString()} words
                  </p>
                  <p className="mt-1 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Link
                      href={`/documents/${doc.id}/flashcards`}
                      className="inline-flex min-h-10 min-w-[120px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-primary/20 transition hover:bg-primary/90"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden>
                        school
                      </span>
                      Study deck
                    </Link>
                    <Link
                      href={`/documents/${doc.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Document
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
