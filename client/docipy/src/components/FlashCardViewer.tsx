"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";
import { cn } from "@/lib/utils";

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  is_mastered: boolean;
}

interface Props {
  cards: Flashcard[];
  documentId: string;
}

export function FlashCardViewer({ cards: initialCards, documentId }: Props) {
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | "review" | "mastered">("all");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const cancelResetRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (filter === "mastered") return c.is_mastered;
      if (filter === "review") return !c.is_mastered;
      return true;
    });
  }, [cards, filter]);

  useEffect(() => {
    setCurrentIndex((i) => {
      if (filtered.length === 0) return 0;
      return Math.min(i, filtered.length - 1);
    });
  }, [filtered.length]);

  useEffect(() => {
    if (!showResetModal) return;
    document.body.style.overflow = "hidden";
    const raf = window.requestAnimationFrame(() => cancelResetRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      window.cancelAnimationFrame(raf);
    };
  }, [showResetModal]);

  useEffect(() => {
    if (!showResetModal) return;
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowResetModal(false);
      }
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showResetModal]);

  const current = filtered.length > 0 ? filtered[currentIndex] : undefined;
  const masteredCount = cards.filter((c) => c.is_mastered).length;
  const progressPct = cards.length > 0 ? (masteredCount / cards.length) * 100 : 0;

  const next = useCallback(() => {
    if (filtered.length === 0) return;
    setIsFlipped(false);
    window.setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % filtered.length);
    }, 150);
  }, [filtered.length]);

  const prev = useCallback(() => {
    if (filtered.length === 0) return;
    setIsFlipped(false);
    window.setTimeout(() => {
      setCurrentIndex((i) => (i - 1 + filtered.length) % filtered.length);
    }, 150);
  }, [filtered.length]);

  async function toggleMastered() {
    if (!current || pending) return;
    const newStatus = !current.is_mastered;
    setActionError("");
    setPending(true);
    try {
      await api.patch(`/api/flashcards/${current.id}/mastered`, { is_mastered: newStatus });
      setCards((prev) => prev.map((c) => (c.id === current.id ? { ...c, is_mastered: newStatus } : c)));
    } catch (err) {
      setActionError(extractApiError(err) || "Could not update card.");
    } finally {
      setPending(false);
    }
  }

  async function confirmResetProgress() {
    setActionError("");
    setPending(true);
    try {
      await api.post(`/api/documents/${documentId}/flashcards/reset`);
      setCards((prev) => prev.map((c) => ({ ...c, is_mastered: false })));
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowResetModal(false);
    } catch (err) {
      setActionError(extractApiError(err) || "Could not reset progress.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showResetModal) return;
      if (e.code === "Space" && e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
        e.preventDefault();
        setIsFlipped((f) => !f);
      }
      if (e.code === "ArrowRight") next();
      if (e.code === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, showResetModal]);

  if (cards.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Progress: {masteredCount}/{cards.length} mastered
          </span>
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            disabled={pending}
            className="text-sm text-slate-500 underline decoration-slate-400/60 underline-offset-2 hover:text-primary disabled:opacity-50 dark:text-slate-400"
          >
            Reset progress
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </div>
      </div>

      {actionError ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "review", "mastered"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              filter === f
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            )}
          >
            {f === "all"
              ? `All (${cards.length})`
              : f === "review"
                ? `Needs review (${cards.filter((c) => !c.is_mastered).length})`
                : `Mastered (${masteredCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-slate-500 dark:text-slate-400">No cards in this category.</p>
      ) : (
        <>
          <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {currentIndex + 1} / {filtered.length}
          </p>

          <div
            className="relative h-64 cursor-pointer perspective-[1000px]"
            onClick={() => setIsFlipped((flip) => !flip)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setIsFlipped((flip) => !flip);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Flip flashcard"
          >
            <div
              className={cn(
                "absolute inset-0 transform-3d transition-transform duration-500",
                isFlipped && "transform-[rotateY(180deg)]"
              )}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/10 bg-white p-8 text-center shadow-xl backface-hidden dark:border-primary/20 dark:bg-slate-900">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Question</p>
                <p className="text-xl font-semibold leading-relaxed text-slate-900 dark:text-white">{current?.question}</p>
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">Click or press Space to reveal answer</p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center shadow-xl backface-hidden transform-[rotateY(180deg)] dark:bg-primary/10">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-primary">Answer</p>
                <p className="text-lg leading-relaxed text-slate-900 dark:text-slate-100">{current?.answer}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={prev}
              disabled={pending}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← Prev
            </button>

            <button
              type="button"
              onClick={() => void toggleMastered()}
              disabled={pending}
              className={cn(
                "rounded-xl border px-5 py-2.5 font-medium transition disabled:opacity-50",
                current?.is_mastered
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 dark:text-amber-200"
              )}
            >
              {current?.is_mastered ? "✓ Mastered" : "⟳ Needs review"}
            </button>

            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next →
            </button>
          </div>
        </>
      )}

      {showResetModal ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] dark:bg-black/60"
            aria-label="Close dialog"
            onClick={() => !pending && setShowResetModal(false)}
          />
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-reset-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-3">
              <h2 id="flashcard-reset-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Reset flashcard progress?
              </h2>
            </header>
            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              All cards will be marked as not mastered. This does not delete your deck.
            </p>
            <footer className="flex flex-wrap justify-end gap-3">
              <button
                ref={cancelResetRef}
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={pending}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmResetProgress()}
                disabled={pending}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-60"
              >
                Reset
              </button>
            </footer>
          </article>
        </div>
      ) : null}
    </section>
  );
}
