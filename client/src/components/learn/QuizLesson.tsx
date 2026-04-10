"use client";

import { useState } from "react";

export type QuizQuestion = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

type QuizLessonProps = {
  questions: QuizQuestion[];
};

export function QuizLesson({ questions }: QuizLessonProps) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  const q = questions[idx];
  if (!q) {
    return <p className="text-sm text-slate-500">No questions in this lesson.</p>;
  }

  const showResult = picked !== null;
  const correct = picked === q.correct_index;

  function choose(optionIndex: number) {
    if (picked !== null) return;
    setPicked(optionIndex);
  }

  function nextQ() {
    if (idx >= questions.length - 1) return;
    setIdx((i) => i + 1);
    setPicked(null);
  }

  return (
    <article className="space-y-6">
      <p className="text-xs font-semibold text-slate-500">
        Question {idx + 1} of {questions.length}
      </p>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{q.question}</h3>
      <ul className="space-y-2 list-none p-0 m-0">
        {q.options.map((opt, i) => {
          const isSel = picked === i;
          const isCorr = i === q.correct_index;
          let ring = "border-slate-200 dark:border-slate-700";
          if (showResult && isCorr) ring = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
          else if (showResult && isSel && !isCorr) ring = "border-red-400 bg-red-50 dark:bg-red-950/20";

          return (
            <li key={i}>
              <button
                type="button"
                disabled={showResult}
                onClick={() => choose(i)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${ring} hover:border-primary/50 disabled:pointer-events-none`}
              >
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {showResult ? (
        <section
          className={`rounded-xl p-4 text-sm ${correct ? "bg-emerald-50 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-100" : "bg-amber-50 dark:bg-amber-950/25 text-amber-950 dark:text-amber-100"}`}
          aria-live="polite"
        >
          <p className="font-bold mb-1">{correct ? "Nice work!" : "Not quite — review the explanation."}</p>
          <p>{q.explanation}</p>
          {idx < questions.length - 1 ? (
            <button
              type="button"
              onClick={nextQ}
              className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Next question
              <span className="material-symbols-outlined text-base" aria-hidden>
                arrow_forward
              </span>
            </button>
          ) : null}
        </section>
      ) : null}
    </article>
  );
}
