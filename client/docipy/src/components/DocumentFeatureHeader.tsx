import Link from "next/link";
import type { ReactNode } from "react";

interface DocumentFeatureHeaderProps {
  documentId: string;
  title: string;
  /** e.g. "Knowledge graph", "Flashcard study" */
  sectionLabel: string;
  /** Material Symbols icon name */
  icon: string;
  /** Optional primary actions (e.g. Generate) shown before Back to document */
  actions?: ReactNode;
}

/**
 * Shared top bar for document sub-routes (chat, graph, flashcards):
 * same layout, icon treatment, and a single exit to the document editor.
 */
export function DocumentFeatureHeader({
  documentId,
  title,
  sectionLabel,
  icon,
  actions,
}: DocumentFeatureHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary" aria-hidden>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{sectionLabel}</p>
          <h1 className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h1>
        </div>
      </div>
      <nav className="flex shrink-0 flex-wrap items-center justify-end gap-2" aria-label="Document feature actions">
        {actions}
        <Link
          href={`/documents/${documentId}`}
          className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Back to document
        </Link>
      </nav>
    </header>
  );
}
