"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatPanel } from "@/components/ChatPanel";

type ChatLessonDrawerProps = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  lessonContext: string | null;
};

export function ChatLessonDrawer({
  open,
  onClose,
  documentId,
  documentTitle,
  lessonContext,
}: ChatLessonDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close chat overlay"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Document chat"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 z-70 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-background-light shadow-2xl dark:border-slate-800 dark:bg-background-dark"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Ask while you learn</p>
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{documentTitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Close chat"
              >
                <span className="material-symbols-outlined" aria-hidden>
                  close
                </span>
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col">
              <ChatPanel
                documentId={documentId}
                documentTitle={documentTitle}
                lessonContext={lessonContext}
                footerLinkHref={`/documents/${documentId}/learn`}
                footerLinkLabel="Back to lesson"
              />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
