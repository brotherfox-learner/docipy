"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { ChatPanel } from "@/components/ChatPanel";

type DocumentFloatingChatProps = {
  documentId: string;
};

export function DocumentFloatingChat({ documentId }: DocumentFloatingChatProps) {
  const t = useTranslations("documents");
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  const chatPath = `/documents/${documentId}/chat`;
  const hideFloating = pathname === chatPath || pathname.startsWith(`${chatPath}/`);

  const loadTitle = useCallback(async () => {
    setTitleError(false);
    try {
      const { data } = await api.get(`/api/documents/${documentId}`);
      const title = (data.data as { title?: string }).title?.trim();
      setDocTitle(title || t("untitledDocument"));
    } catch {
      setTitleError(true);
      setDocTitle(t("documentFallbackTitle"));
    }
  }, [documentId, t]);

  useEffect(() => {
    if (hideFloating) return;
    void loadTitle();
  }, [hideFloating, loadTitle]);

  useEffect(() => {
    if (hideFloating) {
      setOpen(false);
    }
  }, [hideFloating]);

  if (hideFloating) return null;

  const titleReady = docTitle !== null;
  const displayTitle = titleReady ? (docTitle as string) : t("chatLoadingShort");

  function togglePanel() {
    setEverOpened(true);
    setOpen((v) => !v);
  }

  return (
    <div className="fixed bottom-5 right-5 z-90 pointer-events-none">
      <div className="relative flex flex-col items-end">
        {everOpened ? (
          <motion.section
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-hidden={!open}
            aria-label={t("chatDialogAria")}
            initial={false}
            animate={
              open
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 10, scale: 0.97 }
            }
            transition={{ type: "spring", damping: 26, stiffness: 340 }}
            className={`absolute bottom-full right-0 mb-2 flex h-[min(72vh,580px)] w-[min(100vw-1.25rem,22rem)] sm:w-96 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-background-light shadow-2xl dark:border-slate-700 dark:bg-background-dark ${
              open ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{t("chatFloatingEyebrow")}</p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{displayTitle}</p>
                {titleError ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">{t("chatTitleLoadError")}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={chatPath}
                  className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 dark:hover:bg-primary/15"
                >
                  {t("chatFullScreen")}
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label={t("chatHidePanelAria")}
                >
                  <span className="material-symbols-outlined text-[1.25rem]" aria-hidden>
                    expand_more
                  </span>
                </button>
              </div>
            </header>
            <div className="flex min-h-0 flex-1 flex-col">
              {titleReady ? (
                <ChatPanel
                  documentId={documentId}
                  documentTitle={displayTitle}
                  footerLinkHref={chatPath}
                  footerLinkLabel={t("chatOpenFullChat")}
                />
              ) : (
                <section className="p-4" aria-label={t("chatLoadingSectionAria")} aria-busy="true">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t("chatLoadingChat")}</p>
                  <div className="mt-2 flex items-center gap-1.5" aria-hidden>
                    <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="size-2 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
                    <span className="size-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  </div>
                </section>
              )}
            </div>
          </motion.section>
        ) : null}

        <button
          type="button"
          onClick={togglePanel}
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-expanded={open}
          aria-controls={everOpened ? panelId : undefined}
          aria-label={open ? t("chatClosePanelAria") : t("chatOpenPanelAria")}
        >
          <span className="material-symbols-outlined text-[1.75rem]" aria-hidden>
            {open ? "close" : "chat"}
          </span>
        </button>
      </div>
    </div>
  );
}
