"use client";

import { useCallback, useEffect, useState, use } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DocumentFeatureHeader } from "@/components/DocumentFeatureHeader";
import { AiGeneratingPanel } from "@/components/AiGeneratingPanel";
import { DocumentFeatureEmptyState } from "@/components/DocumentFeatureEmptyState";
import { FlashCardViewer, type Flashcard } from "@/components/FlashCardViewer";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const FLASHCARD_GENERATE_LANG_KEY = "docipy.flashcardGenerateLang";

function normalizeFlashcards(raw: unknown): Flashcard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      const o = row as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const question = o.question;
      const answer = o.answer;
      const mastered = o.is_mastered;
      if (!id || typeof question !== "string" || typeof answer !== "string") return null;
      const is_mastered =
        mastered === true ||
        mastered === "t" ||
        (typeof mastered === "string" && mastered.toLowerCase() === "true");
      return {
        id,
        question,
        answer,
        is_mastered,
      };
    })
    .filter((c): c is Flashcard => c !== null);
}

export default function DocumentFlashcardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { refreshUser } = useAuth();
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [docLoadError, setDocLoadError] = useState<string | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [generateLang, setGenerateLangState] = useState<"en" | "th">("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem(FLASHCARD_GENERATE_LANG_KEY);
      if (s === "th" || s === "en") setGenerateLangState(s);
    } catch {
      /* ignore */
    }
  }, []);

  function setGenerateLang(next: "en" | "th") {
    setGenerateLangState(next);
    try {
      localStorage.setItem(FLASHCARD_GENERATE_LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const loadDoc = useCallback(async () => {
    setDocLoadError(null);
    try {
      const { data } = await api.get(`/api/documents/${id}`);
      const title = (data.data as { title?: string }).title;
      setDocTitle(title?.trim() ? title : "Untitled");
    } catch {
      setDocLoadError("Document not found or you do not have access.");
      setDocTitle(null);
    }
  }, [id]);

  const loadCards = useCallback(async () => {
    setListLoading(true);
    setActionError("");
    try {
      const { data } = await api.get(`/api/documents/${id}/flashcards`);
      setCards(normalizeFlashcards(data.data));
    } catch {
      setCards([]);
      setActionError("Could not load flashcards.");
    } finally {
      setListLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDoc();
  }, [loadDoc]);

  useEffect(() => {
    void loadCards();
  }, [id, loadCards]);

  async function handleGenerate() {
    setGenerateLoading(true);
    setActionError("");
    try {
      const { data } = await api.post(`/api/documents/${id}/flashcards`, { lang: generateLang });
      setCards(normalizeFlashcards(data.data));
      void refreshUser();
    } catch (err) {
      setActionError(extractApiError(err) || "Could not generate flashcards.");
    } finally {
      setGenerateLoading(false);
    }
  }

  const headerTitle = docLoadError ? "Document" : docTitle ?? "…";

  return (
    <div className="flex min-h-screen w-full bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <Sidebar />
      <main className="ml-64 flex min-h-screen w-full flex-1 flex-col">
        <DocumentFeatureHeader
          documentId={id}
          title={headerTitle}
          sectionLabel="Flashcard study"
          icon="style"
        />

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
          {docLoadError ? (
            <p className="mb-4 text-center text-sm text-amber-800 dark:text-amber-200" role="status">
              {docLoadError} You can still load or generate flashcards for this link if the deck exists.
            </p>
          ) : null}

          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <p className="text-slate-600 dark:text-slate-400">
                {listLoading
                  ? "Loading deck..."
                  : cards.length === 0
                    ? "Choose card language below, then generate your deck."
                    : "Study with flip cards, filters, and progress."}
              </p>
              {listLoading || cards.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generateLoading || listLoading}
                  className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {generateLoading ? "Generating..." : cards.length === 0 ? "Generate flashcards" : "Regenerate deck"}
                </button>
              ) : null}
            </div>

            <fieldset className="flex flex-wrap items-center gap-3 border-0 p-0 m-0">
              <legend className="sr-only">Language for AI-generated cards</legend>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">AI card language</span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setGenerateLang("en")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-bold transition",
                    generateLang === "en"
                      ? "bg-primary text-white shadow-sm dark:text-white"
                      : "text-slate-800 hover:bg-white/90 dark:text-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setGenerateLang("th")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-bold transition",
                    generateLang === "th"
                      ? "bg-primary text-white shadow-sm dark:text-white"
                      : "text-slate-800 hover:bg-white/90 dark:text-slate-100 dark:hover:bg-slate-700"
                  )}
                >
                  ไทย
                </button>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Applies only when you generate or regenerate the deck.
              </span>
            </fieldset>
          </div>

          {actionError ? (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
              {actionError}
            </p>
          ) : null}

          {listLoading ? (
            <AiGeneratingPanel
              title="Loading your deck..."
              description="Fetching saved cards and study progress for this document."
            />
          ) : generateLoading && cards.length > 0 ? (
            <AiGeneratingPanel
              title="Building your flashcard deck..."
              description="This can take up to a minute. Stay on this page while we refresh cards from your document."
            />
          ) : cards.length === 0 ? (
            <DocumentFeatureEmptyState
              icon="view_carousel"
              title="No flashcard deck yet"
              description="AI will build question-and-answer cards from your document so you can study with flips and track progress."
              loading={generateLoading}
              generatingTitle="Building your flashcard deck..."
              generatingDescription="This can take up to a minute. Stay on this page while we turn your document into study cards."
              primaryAction={
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generateLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {generateLoading ? "Generating..." : "Generate flashcards"}
                </button>
              }
            />
          ) : (
            <FlashCardViewer cards={cards} documentId={id} />
          )}
        </div>
      </main>
    </div>
  );
}
