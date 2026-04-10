"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/Sidebar";
import { AttachFileSection } from "@/components/AttachFileSection";
import { extractApiError } from "@/lib/extractApiError";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { DocumentDetail } from "@/types/document";

function isProPlan(plan: string | undefined) {
  return plan?.toLowerCase() === "pro";
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const isPro = isProPlan(user?.plan);

  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appendingFile, setAppendingFile] = useState(false);
  const [appendPick, setAppendPick] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/api/documents/${id}`);
      const d = data.data as DocumentDetail;
      setDoc(d);
      setTitle(d.title);
      setContent(d.content || "");
    } catch {
      setError("Document not found or you do not have access.");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!doc) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.put(`/api/documents/${id}`, {
        title: title.trim(),
        content: content.trim(),
      });
      setDoc(data.data);
      setTitle(data.data.title);
      setContent(data.data.content || "");
    } catch {
      setError("Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete() {
    setDeletePending(true);
    setError(null);
    try {
      await api.delete(`/api/documents/${id}`);
      setDeleteConfirmOpen(false);
      router.push("/documents");
      router.refresh();
    } catch {
      setError("Could not delete document.");
      setDeleteConfirmOpen(false);
    } finally {
      setDeletePending(false);
    }
  }

  async function executeAppendMerge() {
    const file = appendPick;
    if (!file || !isPro) return;
    setAppendingFile(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.post(`/api/documents/${id}/append-upload`, body, { timeout: 120_000 });
      setAppendPick(null);
      setMergeConfirmOpen(false);
      await load();
    } catch (err: unknown) {
      setMergeConfirmOpen(false);
      setError(extractApiError(err) || "Could not merge file into document.");
    } finally {
      setAppendingFile(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center overflow-y-auto">
          <p className="text-slate-500 dark:text-slate-400">Loading…</p>
        </main>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
            {error || "Not found."}
          </p>
          <Link href="/documents" className="text-primary font-semibold hover:underline">
            ← Back to documents
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-y-auto p-6 md:p-10 w-full">
        <div className="flex flex-col max-w-7xl mx-auto w-full">
        <nav className="flex flex-wrap gap-3 mb-6 text-sm">
          <Link href="/documents" className="text-primary font-semibold hover:underline">
            ← Documents
          </Link>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden>
            |
          </span>
          <Link
            href={`/documents/${id}/learn`}
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Learn
          </Link>
          <Link
            href={`/documents/${id}/chat`}
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Chat
          </Link>
          <Link
            href={`/documents/${id}/flashcards`}
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Flashcards
          </Link>
          <Link
            href={`/documents/${id}/graph`}
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Graph
          </Link>
          <Link
            href={`/documents/${id}/quiz`}
            className="font-semibold text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            Quiz
          </Link>
        </nav>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Edit document
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {doc.word_count.toLocaleString()} words · Updated {new Date(doc.updated_at).toLocaleString()}
            </p>
            <Link
              href={`/documents/${id}/learn`}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden>
                school
              </span>
              Start learning path
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="self-start px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            Delete
          </button>
        </header>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-10">
        <form onSubmit={(e) => void handleSave(e)} className="flex-1 min-w-0 space-y-5">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              required
              maxLength={500}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label
              htmlFor="edit-content"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Content
            </label>
            <textarea
              id="edit-content"
              required
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[280px]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <aside
          aria-label={isPro ? "Append file to document" : "Attach files with Pro"}
          className="w-full lg:w-80 xl:w-88 shrink-0 lg:sticky lg:top-6 lg:self-start space-y-4 mt-7"
        >
          {isPro ? (
            <>
              <AttachFileSection
                file={appendPick}
                onFileChange={setAppendPick}
                disabled={appendingFile}
                heading="Attach File"
                description="PDF or DOCX is merged below your current content and re-indexed for chat and search."
              />
              <button
                type="button"
                disabled={appendingFile || !appendPick}
                onClick={() => setMergeConfirmOpen(true)}
                className="w-full justify-center inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  merge
                </span>
                {appendingFile ? "Merging…" : "Merge file into document"}
              </button>
            </>
          ) : (
            <section className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/25 shadow-sm shadow-amber-900/5 dark:shadow-black/20">
              <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100 mb-2">Attach File</h2>
              <p className="text-sm text-amber-900/85 dark:text-amber-100/80 mb-3">
                Merge PDF or DOCX into this document with Pro — combined text is re-indexed for chat.
              </p>
              <Link
                href="/pricing"
                className="w-full justify-center inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-white/80 dark:bg-slate-900/40 text-sm font-semibold text-amber-950 dark:text-amber-100 hover:bg-white dark:hover:bg-slate-900/60 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  merge
                </span>
                Append PDF / DOCX
                <span className="text-xs font-bold uppercase tracking-wide opacity-90">Pro</span>
              </Link>
            </section>
          )}
        </aside>
        </div>

        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Delete this document permanently?"
          description="This cannot be undone. All associated chat context, flashcards, and quizzes for this document may become unusable."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          pending={deletePending}
          onClose={() => !deletePending && setDeleteConfirmOpen(false)}
          onConfirm={() => void executeDelete()}
        />

        <ConfirmDialog
          open={mergeConfirmOpen}
          title="Merge file into document?"
          description="The PDF or DOCX text will be appended to your content and the document will be re-indexed for chat. This can take a moment."
          confirmLabel="Merge"
          cancelLabel="Cancel"
          variant="primary"
          pending={appendingFile}
          onClose={() => !appendingFile && setMergeConfirmOpen(false)}
          onConfirm={() => void executeAppendMerge()}
        />
        </div>
      </main>
    </div>
  );
}

