"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DocumentToolsTabs } from "@/components/DocumentToolsTabs";

interface DocumentFeatureHeaderProps {
  documentId: string;
  title: string;
  /** e.g. "Knowledge graph", "Flashcard study" */
  sectionLabel: string;
  /** Material Symbols icon name */
  icon: string;
  /** Optional primary actions (e.g. Generate) shown before Back to document */
  actions?: ReactNode;
  /** Show Learn / Summary / Chat / … strip under the title row */
  showToolsStrip?: boolean;
}

/**
 * Shared top bar for document sub-routes (chat, graph, flashcards, summary):
 * same layout, icon treatment, quick links to other document tools, and exit to the editor.
 */
export function DocumentFeatureHeader({
  documentId,
  title,
  sectionLabel,
  icon,
  actions,
  showToolsStrip = true,
}: DocumentFeatureHeaderProps) {
  const t = useTranslations("documents");

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary" aria-hidden>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{sectionLabel}</p>
            <h1 className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h1>
          </div>
        </div>
        <nav
          className="flex shrink-0 flex-wrap items-center justify-end gap-2"
          aria-label={t("featureActionsAria")}
        >
          {actions}
          <Link
            href={`/documents/${documentId}`}
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t("backToDocument")}
          </Link>
        </nav>
      </div>
      {showToolsStrip ? (
        <DocumentToolsTabs
          documentId={documentId}
          className="border-t border-slate-200/90 px-4 py-2 dark:border-slate-800"
        />
      ) : null}
    </header>
  );
}
