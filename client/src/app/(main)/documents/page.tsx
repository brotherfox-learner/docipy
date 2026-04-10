"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { DocumentListItem } from "@/types/document";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function isProPlan(plan: string | undefined) {
  return plan?.toLowerCase() === "pro";
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const isPro = isProPlan(user?.plan);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get("/api/documents", {
        params: { search, limit: 50, page: 1 },
      });
      setDocuments(data.data.documents);
      setTotal(data.data.total);
    } catch {
      setError("Could not load documents. Try again.");
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setIsLoading(true);
    const t = window.setTimeout(() => {
      void fetchDocuments();
    }, 300);
    return () => window.clearTimeout(t);
  }, [fetchDocuments]);

  async function executeDelete() {
    const id = deleteTargetId;
    if (!id) return;
    setDeletePending(true);
    setError(null);
    try {
      await api.delete(`/api/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setTotal((n) => Math.max(0, n - 1));
      setDeleteTargetId(null);
    } catch {
      setError("Failed to delete document.");
      setDeleteTargetId(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <section className="max-w-6xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Documents
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {total} document{total !== 1 ? "s" : ""}
            {isPro ? " · Pro — file upload enabled" : " · Free plan: 5 documents max"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isPro ? (
            <Link
              href="/documents/new?mode=file"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                upload_file
              </span>
              New from file
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/35 text-sm font-semibold text-amber-950 dark:text-amber-100 hover:bg-amber-100/90 dark:hover:bg-amber-950/55 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                upload
              </span>
              Upload PDF / DOCX
              <span className="text-xs font-bold uppercase tracking-wide opacity-90">Pro</span>
            </Link>
          )}
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New document
          </Link>
        </div>
      </header>

      <label className="sr-only" htmlFor="doc-search">
        Search documents
      </label>
      <input
        id="doc-search"
        type="search"
        placeholder="Search by title…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md mb-6 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* {isPro && (
        <section aria-label="Upload document from file" className="mb-8 max-w-xl">
          <AttachFileSection
            file={uploadPick}
            onFileChange={setUploadPick}
            disabled={uploading}
            description="Pick a file, then confirm upload. Title defaults to the file name."
          />
          <button
            type="button"
            disabled={uploading || !uploadPick}
            onClick={() => void handleConfirmUpload()}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              cloud_upload
            </span>
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </section>
      )} */}

      {isLoading ? (
        <p className="text-center py-16 text-slate-500 dark:text-slate-400">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-center py-16 text-slate-500 dark:text-slate-400">
          No documents yet. Create a text document with &quot;New document&quot;, or{" "}
          {isPro ? (
            <>use &quot;Attach File&quot; above or New from file.</>
          ) : (
            <>
              <Link href="/pricing" className="text-primary font-semibold hover:underline">
                upgrade to Pro
              </Link>{" "}
              to upload PDF/DOCX from this page.
            </>
          )}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <Link href={`/documents/${doc.id}`} className="block group">
                <h2 className="font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                  {doc.title}
                </h2>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-4">
                {doc.word_count.toLocaleString()} words ·{" "}
                {new Date(doc.created_at).toLocaleDateString()}
                {doc.file_url ? " · File" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex-1 min-w-[88px] text-center py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Open
                </Link>
                <Link
                  href={`/documents/${doc.id}/chat`}
                  className="flex-1 min-w-[88px] text-center py-2 text-sm font-semibold rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                >
                  Chat
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(doc.id)}
                  className="px-3 py-2 text-sm font-semibold rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Delete this document?"
        description="This cannot be undone. The document will be removed from your library."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        pending={deletePending}
        onClose={() => !deletePending && setDeleteTargetId(null)}
        onConfirm={() => void executeDelete()}
      />
    </section>
  );
}
