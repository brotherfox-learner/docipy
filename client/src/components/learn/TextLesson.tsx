"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";

type TextLessonProps = {
  body: string;
  keyPoints: string[];
};

export function TextLesson({ body, keyPoints }: TextLessonProps) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  function readAloud() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    stop();
    const text = [body.replace(/[#*_`]/g, " "), ...keyPoints].join(". ");
    const u = new SpeechSynthesisUtterance(text);
    utterRef.current = u;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={speaking ? stop : readAloud}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-base" aria-hidden>
            {speaking ? "stop_circle" : "volume_up"}
          </span>
          {speaking ? "Stop" : "Read aloud"}
        </button>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <ChatMarkdown content={body} />
      </div>
      {keyPoints.length > 0 ? (
        <section aria-labelledby="key-points-heading">
          <h3 id="key-points-heading" className="text-sm font-bold text-slate-900 dark:text-white mb-3">
            Key points
          </h3>
          <ul className="list-none space-y-2 p-0 m-0">
            {keyPoints.map((p, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-slate-700 dark:text-slate-300 rounded-lg bg-primary/5 dark:bg-primary/10 px-3 py-2 border border-primary/15 dark:border-primary/20"
              >
                <span className="material-symbols-outlined text-primary text-lg shrink-0" aria-hidden>
                  check_circle
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
