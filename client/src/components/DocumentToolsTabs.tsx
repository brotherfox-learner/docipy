"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/** Order: Learn first, then Summary, then other document tools */
export const DOCUMENT_TOOL_SUFFIXES = [
  "/learn",
  "/summary",
  "/chat",
  "/graph",
  "/flashcards",
  "/quiz",
] as const;

type DocumentToolsTabsProps = {
  documentId: string;
  /** Extra classes on the outer nav (e.g. border-t, rounded wrapper) */
  className?: string;
};

export function DocumentToolsTabs({ documentId, className = "" }: DocumentToolsTabsProps) {
  const pathname = usePathname();
  const t = useTranslations("documents");

  const labelBySuffix: Record<(typeof DOCUMENT_TOOL_SUFFIXES)[number], string> = {
    "/learn": t("learn"),
    "/summary": t("summary"),
    "/chat": t("chat"),
    "/graph": t("graph"),
    "/flashcards": t("flashcards"),
    "/quiz": t("quiz"),
  };

  return (
    <nav className={className.trim() || undefined} aria-label={t("toolsNavAria")}>
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0 sm:gap-2">
        {DOCUMENT_TOOL_SUFFIXES.map((suffix) => {
          const href = `/documents/${documentId}${suffix}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={suffix}>
              <Link
                href={href}
                className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
                  active
                    ? "bg-primary/15 text-slate-900 dark:bg-primary/25 dark:text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                {labelBySuffix[suffix]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
