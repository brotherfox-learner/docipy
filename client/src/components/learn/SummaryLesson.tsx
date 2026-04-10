"use client";

import { ChatMarkdown } from "@/components/ChatMarkdown";

type SummaryLessonProps = {
  body: string;
  takeaways: string[];
};

export function SummaryLesson({ body, takeaways }: SummaryLessonProps) {
  return (
    <article className="space-y-6">
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <ChatMarkdown content={body} />
      </div>
      {takeaways.length > 0 ? (
        <section aria-labelledby="takeaways-heading">
          <h3 id="takeaways-heading" className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Takeaways
          </h3>
          <ul className="list-none space-y-2 p-0 m-0">
            {takeaways.map((t, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-700 dark:text-slate-300"
              >
                <span className="material-symbols-outlined text-amber-500 text-lg shrink-0" aria-hidden>
                  star
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
