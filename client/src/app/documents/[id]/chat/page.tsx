"use client";

import { useCallback, useEffect, useState, use } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DocumentFeatureHeader } from "@/components/DocumentFeatureHeader";
import { ChatPanel } from "@/components/ChatPanel";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDoc = useCallback(async () => {
    setLoadError(null);
    try {
      const { data } = await api.get(`/api/documents/${id}`);
      setDocTitle((data.data as { title?: string }).title || "Untitled");
    } catch {
      setLoadError("Document not found or you do not have access.");
      setDocTitle(null);
    }
  }, [id]);

  useEffect(() => {
    void loadDoc();
  }, [loadDoc]);

  if (loadError || docTitle === null) {
    return (
      <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          {loadError ? (
            <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
              {loadError}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">Loading…</p>
          )}
          <Link href="/documents" className="text-primary font-semibold hover:underline">
            ← Back to documents
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col relative h-full">
        <DocumentFeatureHeader
          documentId={id}
          title={docTitle}
          sectionLabel="Chat with document"
          icon="chat"
          actions={
            <Link
              href="/chat"
              className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Pick document
            </Link>
          }
        />

        <ChatPanel documentId={id} documentTitle={docTitle} />
      </main>
    </div>
  );
}
