"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ChatMarkdown } from "@/components/ChatMarkdown";

export type ChatPanelProps = {
  documentId: string;
  documentTitle: string;
  /** Optional context passed to RAG (e.g. current lesson title and summary). */
  lessonContext?: string | null;
  footerLinkHref?: string;
  footerLinkLabel?: string;
};

type ChatTurn = {
  id: string;
  question: string;
  answer: string;
  pending?: boolean;
};

const THREAD_MAX = "max-w-[1280px]";

function ThinkingIndicator() {
  return (
    <div
      className="flex flex-wrap items-center gap-2.5 text-slate-600 dark:text-slate-300"
      role="status"
      aria-live="polite"
      aria-label="Assistant is thinking"
    >
      <span className="text-sm font-semibold">Thinking...</span>
      <span className="flex items-center gap-1.5" aria-hidden>
        <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="size-2 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
        <span className="size-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
      </span>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="size-9 shrink-0 rounded-full bg-primary/15 dark:bg-primary/20 flex items-center justify-center text-primary ring-1 ring-primary/25 dark:ring-primary/30"
      aria-hidden
    >
      <span className="material-symbols-outlined text-[1.125rem]">smart_toy</span>
    </div>
  );
}

function UserAvatarBubble() {
  const { user } = useAuth();
  const initial =
    (user?.name?.trim()?.charAt(0) || user?.email?.trim()?.charAt(0) || "?").toUpperCase();

  if (user?.avatar_url) {
    return (
      <div className="size-9 rounded-full overflow-hidden shrink-0 ring-1 ring-slate-200 dark:ring-slate-600">
        <img
          className="w-full h-full object-cover"
          src={user.avatar_url}
          alt={user.name ? `Profile photo of ${user.name}` : "Your profile photo"}
          width={36}
          height={36}
        />
      </div>
    );
  }

  return (
    <div
      className="size-9 rounded-full shrink-0 ring-1 ring-slate-200 dark:ring-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-200"
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function ChatPanel({
  documentId,
  documentTitle,
  lessonContext,
  footerLinkHref,
  footerLinkLabel,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/documents/${documentId}/chat/history`);
      const rows = data.data as { id: string; question: string; answer: string }[];
      setTurns(
        rows.map((r) => ({
          id: r.id,
          question: r.question,
          answer: r.answer,
        }))
      );
    } catch {
      setError("Could not load chat history.");
      setTurns([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [documentId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [turns, loadingHistory, scrollToBottom]);

  async function submitMessage() {
    const question = input.trim();
    if (!question || sending) return;

    setSending(true);
    setError(null);
    setInput("");

    const tempId = `pending-${crypto.randomUUID()}`;
    setTurns((prev) => [...prev, { id: tempId, question, answer: "", pending: true }]);

    try {
      const { data } = await api.post(
        `/api/documents/${documentId}/chat`,
        {
          question,
          ...(lessonContext?.trim() ? { context: lessonContext.trim().slice(0, 5000) } : {}),
        },
        { timeout: 120000 }
      );
      const payload = data.data as { question: string; answer: string };
      setTurns((prev) =>
        prev.map((t) =>
          t.id === tempId
            ? { id: tempId, question: payload.question, answer: payload.answer }
            : t
        )
      );
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response
        ?.status;
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setTurns((prev) => prev.filter((t) => t.id !== tempId));
      if (status === 429) {
        setError(msg || "Daily AI query limit reached.");
      } else {
        setError(msg || "Could not get a reply. Try again.");
      }
      setInput(question);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void submitMessage();
  }

  const bubbleUser =
    "max-w-[min(100%,22rem)] sm:max-w-[min(100%,26rem)] px-4 py-3 rounded-2xl rounded-br-md bg-primary text-white shadow-sm";
  const bubbleAssistant =
    "max-w-[min(100%,22rem)] sm:max-w-[min(100%,26rem)] px-4 py-3 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700/80";

  const editHref = footerLinkHref ?? `/documents/${documentId}`;
  const editLabel = footerLinkLabel ?? "Edit document";

  return (
    <div className="flex flex-col flex-1 min-h-0 relative h-full">
      <section
        className="flex-1 overflow-y-auto scroll-smooth pb-36 pt-2 min-h-0"
        aria-label="Chat messages"
      >
        {/* ส่วนบนสุดของการแสดงผลของการค้นหา */}
        <div className={`mx-auto w-full ${THREAD_MAX} px-4 sm:px-5`}>
          {loadingHistory ? (
            <section className="py-4" aria-label="Loading conversation" aria-busy="true">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loading conversation...</p>
              <div className="mt-2 flex items-center gap-1.5" aria-hidden>
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="size-2 rounded-full bg-sky-500 animate-pulse [animation-delay:150ms]" />
                <span className="size-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
              </div>
            </section>
          ) : null}

          {!loadingHistory && turns.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 py-4"
            >
              <AssistantAvatar />
              <article
                className={`${bubbleAssistant} leading-relaxed text-sm sm:text-[0.9375rem] max-w-none sm:max-w-[min(100%,26rem)]`}
              >
                <p>
                  Ask anything about{" "}
                  <span className="font-semibold text-primary dark:text-primary">{documentTitle}</span>
                  . Answers prefer retrieved passages when your document is indexed; otherwise the model
                  reads a short excerpt.
                </p>
              </article>
            </motion.div>
          ) : null}
          {/* ส่วนของการแสดงผลของการค้นหา */}
          <div className="flex flex-col gap-6 py-2 mb-4">
            {turns.map((turn) => (
              <div key={turn.id} className="flex flex-col gap-2.5">
                <div className="flex items-end justify-end gap-2.5">
                  {/* ส่วนของคำถามของผู้ใช้ */}
                  <article className={`${bubbleUser} text-sm sm:text-[0.9375rem]`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{turn.question}</p>
                  </article>
                  <UserAvatarBubble />
                </div>
                <div className="flex items-end justify-start gap-2.5">
                  {/* ส่วนของคำตอบจาก AI */}
                  <AssistantAvatar />
                  <article className={`${bubbleAssistant} text-sm sm:text-[0.9375rem]`}>
                    {turn.pending ? (
                      <ThinkingIndicator />
                    ) : (
                      <ChatMarkdown content={turn.answer} />
                    )}
                  </article>
                </div>
              </div>
            ))}
          </div>

          {error ? (
            <p className="text-red-600 dark:text-red-400 text-sm py-3" role="alert">
              {error}
            </p>
          ) : null}

          <div ref={bottomRef} className="h-2" />
        </div>
      </section>
      {/* ส่วนของ Chat box สำหรับการค้นหา */}
      <footer className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <div
          className={`mx-auto w-full ${THREAD_MAX} px-4 sm:px-5 pb-5 pt-10 bg-linear-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent pointer-events-auto`}
        >
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md dark:shadow-none focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-colors"
          >
            <div className="flex items-end gap-2 p-2 sm:p-2.5">
              <label htmlFor="chat-message" className="sr-only">
                Message about this document
              </label>
              <textarea
                id="chat-message"
                name="message"
                value={input}
                onChange={(ev) => setInput(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    void submitMessage();
                  }
                }}
                className="flex-1 min-h-11 max-h-28 bg-transparent border-0 focus:ring-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none py-2 px-2 text-sm focus:outline-none"
                placeholder="Ask a question about this document…"
                rows={2}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="size-9 shrink-0 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm disabled:opacity-45 disabled:pointer-events-none hover:opacity-95 transition-opacity"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span className="material-symbols-outlined text-[14px]">auto_mode</span>
                  RAG
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
                  Enter · send · Shift+Enter · new line
                </span>
              </div>
              <Link
                href={editHref}
                className="text-[10px] font-semibold text-primary hover:underline shrink-0"
              >
                {editLabel}
              </Link>
            </div>
          </form>
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-2">
            AI can make mistakes. Verify important information with the source document.
          </p>
        </div>
      </footer>
    </div>
  );
}
