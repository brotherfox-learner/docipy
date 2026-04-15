import type { ReactNode } from "react";
import { AiGeneratingPanel } from "@/components/AiGeneratingPanel";

type DocumentFeatureEmptyStateProps = {
  /** Material Symbols icon name */
  icon: string;
  title: string;
  description: string;
  primaryAction?: ReactNode;
  /** When true, shows the shared AI generating panel instead of primaryAction */
  loading?: boolean;
  /** @deprecated Prefer generatingTitle + generatingDescription. Used as description fallback. */
  loadingLabel?: string;
  generatingTitle?: string;
  generatingDescription?: string;
  generatingFooter?: ReactNode;
};

/**
 * Shared empty state for document-scoped features (flashcards, quiz, knowledge graph).
 * Matches the hub-style cards used on /flashcards and /chat.
 */
export function DocumentFeatureEmptyState({
  icon,
  title,
  description,
  primaryAction,
  loading = false,
  loadingLabel,
  generatingTitle,
  generatingDescription,
  generatingFooter,
}: DocumentFeatureEmptyStateProps) {
  const panelTitle = generatingTitle ?? "Building...";
  const panelDescription =
    generatingDescription ??
    loadingLabel ??
    "This can take up to a minute. Stay on this page while we get things ready.";

  if (loading) {
    return (
      <AiGeneratingPanel
        title={panelTitle}
        description={panelDescription}
        footer={generatingFooter}
      />
    );
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="document-feature-empty-title"
    >
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <span className="material-symbols-outlined text-3xl" aria-hidden>
          {icon}
        </span>
      </div>
      <h2 id="document-feature-empty-title" className="text-lg font-bold text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {primaryAction ? <div className="mt-6 flex flex-wrap justify-center gap-3">{primaryAction}</div> : null}
    </section>
  );
}
