"use client";

import { useMemo } from "react";

type ImageLessonProps = {
  caption: string;
  alt: string;
  description: string;
  /** From AI when present — short bullets to remember */
  keyIdeas?: string[];
  /** One reflection question from AI */
  selfCheck?: string;
};

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function ImageLesson({ caption, alt, description, keyIdeas, selfCheck }: ImageLessonProps) {
  const sentences = useMemo(() => splitIntoSentences(description), [description]);

  const ideas = useMemo(() => {
    const fromAi = (keyIdeas ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
    if (fromAi.length > 0) return fromAi.slice(0, 6);
    const rest = sentences.slice(1, 5);
    return rest.length > 0 ? rest : sentences.slice(0, 1);
  }, [keyIdeas, sentences]);

  const coreIdea = sentences[0]?.trim() || description.trim() || caption;

  const checkQuestion = useMemo(() => {
    const q = (selfCheck ?? "").trim();
    if (q.length > 0) return q;
    return `Without scrolling back, how would you explain “${caption}” in one sentence?`;
  }, [selfCheck, caption]);

  return (
    <article className="space-y-5">
      <header className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800 dark:border-teal-400/25 dark:bg-teal-500/15 dark:text-teal-200">
          <span className="material-symbols-outlined text-base" aria-hidden>
            psychology
          </span>
          Key concept
        </div>
        <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">{caption}</h3>
        <p className="sr-only">{alt}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-[1.75rem] border border-slate-200/80 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-slate-950/50">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Core idea
          </p>
          <p className="mt-3 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100 sm:text-xl sm:leading-9">
            {coreIdea}
          </p>
        </section>

        <section className="flex flex-col rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            What to remember
          </p>
          {ideas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No extra points for this step.</p>
          ) : (
            <ul className="mt-4 space-y-3 list-none p-0 m-0">
              {ideas.map((item, index) => (
                <li key={`${item.slice(0, 24)}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  <span
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-xs font-black text-teal-800 dark:bg-teal-500/20 dark:text-teal-200"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-[1.75rem] border-2 border-dashed border-teal-300/70 bg-teal-50/50 p-6 dark:border-teal-500/35 dark:bg-teal-950/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md dark:bg-teal-500"
            aria-hidden
          >
            <span className="material-symbols-outlined text-2xl">quiz</span>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-800 dark:text-teal-200">
              Self-check (do this before Next)
            </p>
            <p className="mt-2 text-base font-semibold leading-7 text-slate-900 dark:text-slate-100">
              {checkQuestion}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Answering in your head locks the idea in better than skimming pretty visuals.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
