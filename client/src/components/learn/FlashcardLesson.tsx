"use client";

import { useState } from "react";

export type FlashcardItem = { front: string; back: string };

type FlashcardLessonProps = {
  cards: FlashcardItem[];
};

export function FlashcardLesson({ cards }: FlashcardLessonProps) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = cards[i];
  if (!card) {
    return <p className="text-sm text-slate-500">No flashcards in this lesson.</p>;
  }

  function flip() {
    setFlipped(!flipped);
  }

  function go(delta: number) {
    setI((x) => Math.min(Math.max(0, x + delta), cards.length - 1));
    setFlipped(false);
  }

  return (
    <article className="space-y-6">
      <p className="text-xs font-semibold text-slate-500 text-center">
        Card {i + 1} of {cards.length} · tap card to flip
      </p>
      <button
        type="button"
        onClick={flip}
        className="w-full min-h-48 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-linear-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center text-center shadow-inner transition-transform active:scale-[0.99]"
        aria-label={flipped ? "Show question side" : "Show answer side"}
      >
        <div className="max-w-md">
          <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">
            {flipped ? "Answer" : "Question"}
          </p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
            {flipped ? card.back : card.front}
          </p>
        </div>
      </button>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={i === 0}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden>
            arrow_back
          </span>
          Prev
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i === cards.length - 1}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-40"
        >
          Next
          <span className="material-symbols-outlined text-lg" aria-hidden>
            arrow_forward
          </span>
        </button>
      </div>
    </article>
  );
}
