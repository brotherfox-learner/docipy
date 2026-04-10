"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DocumentFeatureEmptyState } from "@/components/DocumentFeatureEmptyState";
import { DocumentFeatureHeader } from "@/components/DocumentFeatureHeader";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const QUIZ_GENERATE_LANG_KEY = "docipy.quizGenerateLang";
const QUIZ_RESULT_MODE_KEY = "docipy.quizResultMode";

type QuizResultMode = "score_only" | "full_review";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  question_type: string;
}

interface QuizPack {
  id: string;
  document_id: string;
  created_at: string;
  questions: QuizQuestion[];
}

function parseOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeQuizzes(raw: unknown): QuizPack[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      const id = o.id != null ? String(o.id) : "";
      const document_id = o.document_id != null ? String(o.document_id) : "";
      const created_at = o.created_at != null ? String(o.created_at) : "";
      const qRaw = o.questions;
      if (!id || !Array.isArray(qRaw)) return null;
      const questions: QuizQuestion[] = qRaw
        .map((qr) => {
          const q = qr as Record<string, unknown>;
          const qid = q.id != null ? String(q.id) : "";
          const question = q.question;
          const correct_answer = q.correct_answer;
          const question_type = q.question_type != null ? String(q.question_type) : "multiple_choice";
          if (!qid || typeof question !== "string" || typeof correct_answer !== "string") return null;
          return {
            id: qid,
            question,
            options: parseOptions(q.options),
            correct_answer,
            question_type,
          };
        })
        .filter((x): x is QuizQuestion => x !== null);
      return { id, document_id, created_at, questions };
    })
    .filter((x): x is QuizPack => x !== null && x.questions.length > 0);
}

export default function DocumentQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { refreshUser } = useAuth();
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [docLoadError, setDocLoadError] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizPack[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [generateLang, setGenerateLangState] = useState<"en" | "th">("en");
  const [resultMode, setResultModeState] = useState<QuizResultMode>("full_review");
  const [submitted, setSubmitted] = useState(false);
  /** question id → user's choice (label text) */
  const [picked, setPicked] = useState<Record<string, string | null>>({});

  useEffect(() => {
    try {
      const s = localStorage.getItem(QUIZ_GENERATE_LANG_KEY);
      if (s === "th" || s === "en") setGenerateLangState(s);
      const rm = localStorage.getItem(QUIZ_RESULT_MODE_KEY);
      if (rm === "score_only" || rm === "full_review") setResultModeState(rm);
    } catch {
      /* ignore */
    }
  }, []);

  function setGenerateLang(next: "en" | "th") {
    setGenerateLangState(next);
    try {
      localStorage.setItem(QUIZ_GENERATE_LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function setResultMode(next: QuizResultMode) {
    setResultModeState(next);
    try {
      localStorage.setItem(QUIZ_RESULT_MODE_KEY, next);
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

  const loadQuizzes = useCallback(async () => {
    setListLoading(true);
    setActionError("");
    try {
      const { data } = await api.get(`/api/documents/${id}/quizzes`);
      const list = normalizeQuizzes(data.data);
      setQuizzes(list);
      setActiveQuizId((prev) => {
        if (prev && list.some((q) => q.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
      setPicked({});
      setSubmitted(false);
    } catch {
      setQuizzes([]);
      setActiveQuizId(null);
      setActionError("Could not load quizzes.");
    } finally {
      setListLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDoc();
  }, [loadDoc]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  const activeQuiz = useMemo(
    () => quizzes.find((q) => q.id === activeQuizId) ?? null,
    [quizzes, activeQuizId]
  );

  const score = useMemo(() => {
    if (!activeQuiz) return { correct: 0, total: 0 };
    let c = 0;
    for (const q of activeQuiz.questions) {
      const p = picked[q.id];
      if (p != null && p === q.correct_answer) c += 1;
    }
    return { correct: c, total: activeQuiz.questions.length };
  }, [activeQuiz, picked]);

  const answeredCount = useMemo(() => {
    if (!activeQuiz) return 0;
    return activeQuiz.questions.filter((q) => picked[q.id] != null && picked[q.id] !== "").length;
  }, [activeQuiz, picked]);

  const allAnswered = activeQuiz != null && answeredCount === activeQuiz.questions.length;

  function handleSubmitAnswers() {
    if (!allAnswered) return;
    setSubmitted(true);
  }

  function handleTryAgain() {
    setSubmitted(false);
    setPicked({});
  }

  async function handleGenerate() {
    setGenerateLoading(true);
    setActionError("");
    try {
      const { data } = await api.post(`/api/documents/${id}/quiz`, { lang: generateLang });
      const payload = data.data as { quizId?: string; questions?: unknown[] };
      const quizId = payload.quizId != null ? String(payload.quizId) : "";
      const questionsRaw = Array.isArray(payload.questions) ? payload.questions : [];
      const questions: QuizQuestion[] = questionsRaw
        .map((qr) => {
          const q = qr as Record<string, unknown>;
          const qid = q.id != null ? String(q.id) : "";
          const question = q.question;
          const correct_answer = q.correct_answer;
          const question_type = q.question_type != null ? String(q.question_type) : "multiple_choice";
          if (!qid || typeof question !== "string" || typeof correct_answer !== "string") return null;
          return {
            id: qid,
            question,
            options: parseOptions(q.options),
            correct_answer,
            question_type,
          };
        })
        .filter((x): x is QuizQuestion => x !== null);

      if (!quizId || questions.length === 0) {
        setActionError("Quiz was created but the response could not be read. Try refresh.");
        await loadQuizzes();
        void refreshUser();
        return;
      }

      const pack: QuizPack = {
        id: quizId,
        document_id: id,
        created_at: new Date().toISOString(),
        questions,
      };
      setQuizzes((prev) => [pack, ...prev]);
      setActiveQuizId(quizId);
      setPicked({});
      setSubmitted(false);
      void refreshUser();
    } catch (err) {
      setActionError(extractApiError(err) || "Could not generate quiz.");
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
          sectionLabel="Quiz practice"
          icon="quiz"
        />

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
          {docLoadError ? (
            <p className="mb-4 text-center text-sm text-amber-800 dark:text-amber-200" role="status">
              {docLoadError} You may still open quizzes if this document belongs to you.
            </p>
          ) : null}

          <div className="mb-8 flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <p className="text-slate-600 dark:text-slate-400">
                {listLoading
                  ? "Loading quizzes…"
                  : quizzes.length === 0
                    ? "Choose quiz language below, then generate your first set."
                    : "Choose a set, answer every question, then submit once. Pick how you want results shown."}
              </p>
              {listLoading || quizzes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generateLoading || listLoading}
                  className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {generateLoading ? "Generating…" : "Generate new quiz set"}
                </button>
              ) : null}
            </div>

            <fieldset className="flex flex-wrap items-center gap-3 border-0 p-0 m-0">
              <legend className="sr-only">Language for AI-generated quiz</legend>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">AI quiz language</span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setGenerateLang("en")}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-bold transition",
                    generateLang === "en"
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  )}
                >
                  ไทย
                </button>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Applies only when you generate a new quiz set.
              </span>
            </fieldset>
          </div>

          {actionError ? (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
              {actionError}
            </p>
          ) : null}

          {!listLoading && quizzes.length === 0 ? (
            <DocumentFeatureEmptyState
              icon="fact_check"
              title="No quiz sets yet"
              description="Generate multiple-choice or true/false questions from this document, then submit once to see your score or a full review."
              loading={generateLoading}
              loadingLabel="Generating quiz…"
              primaryAction={
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={generateLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {generateLoading ? "Generating…" : "Generate new quiz set"}
                </button>
              }
            />
          ) : null}

          {!listLoading && quizzes.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Quiz sets</h2>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Quiz sets for this document">
                {quizzes.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    role="tab"
                    aria-selected={q.id === activeQuizId}
                    onClick={() => {
                      setActiveQuizId(q.id);
                      setPicked({});
                      setSubmitted(false);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                      q.id === activeQuizId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    {new Date(q.created_at).toLocaleString()} · {q.questions.length} Q
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeQuiz ? (
            <section aria-label="Quiz questions" className="space-y-8">
              {!submitted ? (
                <fieldset className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    After you submit
                  </legend>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Choose before submitting — after submitting, you cannot change the mode in this attempt
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 has-checked:border-primary has-checked:bg-primary/5">
                      <input
                        type="radio"
                        name="quiz-result-mode"
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                        checked={resultMode === "score_only"}
                        onChange={() => setResultMode("score_only")}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">Score only</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Show only total score.</span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 has-checked:border-primary has-checked:bg-primary/5">
                      <input
                        type="radio"
                        name="quiz-result-mode"
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-primary"
                        checked={resultMode === "full_review"}
                        onChange={() => setResultMode("full_review")}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">Full review</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Show correct or incorrect for each question</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
              ) : null}

              <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
                {submitted ? (
                  resultMode === "score_only" ? (
                    <span>Submitted — showing score only.</span>
                  ) : (
                    <span>Submitted — review your answers below.</span>
                  )
                ) : (
                  <span>
                    Answered {answeredCount} / {activeQuiz.questions.length}
                  </span>
                )}
              </p>

              {activeQuiz.questions.map((q, idx) => {
                const choice = picked[q.id];
                const isTf = q.question_type === "true_false";
                const choices =
                  isTf && q.options.length >= 2 ? q.options : isTf ? ["True", "False"] : q.options;
                const showPerQuestionReview = submitted && resultMode === "full_review";
                const wrongButAnswered =
                  showPerQuestionReview && choice != null && choice !== q.correct_answer;
                return (
                  <article
                    key={q.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">
                      Question {idx + 1} of {activeQuiz.questions.length}
                    </p>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">{q.question}</h3>
                    <ul className="space-y-2">
                      {choices.map((opt, optIdx) => {
                        const selected = choice === opt;
                        const isCorrect = opt === q.correct_answer;
                        const locked = submitted;
                        return (
                          <li key={`${q.id}-${optIdx}`}>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() =>
                                setPicked((prev) => ({
                                  ...prev,
                                  [q.id]: opt,
                                }))
                              }
                              className={cn(
                                "w-full text-left rounded-xl border px-4 py-3 text-sm font-medium transition",
                                !submitted && !selected && "border-slate-200 hover:border-primary/50 dark:border-slate-700",
                                !submitted && selected && "border-primary bg-primary/10 text-slate-900 dark:text-white",
                                showPerQuestionReview &&
                                  isCorrect &&
                                  "border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                                showPerQuestionReview &&
                                  selected &&
                                  !isCorrect &&
                                  "border-red-500/60 bg-red-500/10 text-red-800 dark:text-red-200",
                                showPerQuestionReview &&
                                  !selected &&
                                  !isCorrect &&
                                  "border-slate-200 opacity-55 dark:border-slate-700",
                                submitted &&
                                  resultMode === "score_only" &&
                                  selected &&
                                  "border-primary/50 bg-primary/5 dark:border-primary/40",
                                submitted &&
                                  resultMode === "score_only" &&
                                  !selected &&
                                  "border-slate-200 opacity-50 dark:border-slate-800"
                              )}
                            >
                              {opt}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {wrongButAnswered ? (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                        Correct answer:{" "}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">{q.correct_answer}</span>
                      </p>
                    ) : null}
                  </article>
                );
              })}

              <footer className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-4">
                {submitted ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        Score: {score.correct} / {score.total}
                      </p>
                      {resultMode === "score_only" ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Switch to &quot;Full review&quot; before your next attempt to see each question marked.
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTryAgain()}
                      className="shrink-0 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Submit checks your answers once. You can change until you submit.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSubmitAnswers()}
                      disabled={!allAnswered}
                      className="shrink-0 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit answers
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Free plan: up to 3 quiz sets per document. Pro: unlimited sets.
                </p>
              </footer>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
