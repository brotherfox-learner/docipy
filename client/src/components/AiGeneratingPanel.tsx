import type { ReactNode } from "react";

export type AiGeneratingPanelProps = {
  title: string;
  description: string;
  /** Optional control row under the dots (e.g. Learn “Try again”). */
  footer?: ReactNode;
};

/**
 * Full-width status panel matching the learn-path “Building your lessons...” treatment.
 */
export function AiGeneratingPanel({ title, description, footer }: AiGeneratingPanelProps) {
  return (
    <section
      className="rounded-4xl border border-cyan-200/70 bg-[linear-gradient(135deg,rgba(236,254,255,0.95),rgba(239,246,255,0.92))] p-8 text-center shadow-[0_18px_50px_rgba(125,211,252,0.16)] dark:border-cyan-400/20 dark:bg-[linear-gradient(135deg,rgba(8,28,36,0.9),rgba(11,18,34,0.92))]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-lg font-black text-slate-900 dark:text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      <div className="flex justify-center gap-2 pt-5" aria-hidden>
        <span className="size-2.5 rounded-full bg-cyan-400 animate-pulse" />
        <span className="size-2.5 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
        <span className="size-2.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
      </div>
      {footer ? <div className="mt-5 flex flex-col items-center gap-2">{footer}</div> : null}
    </section>
  );
}
