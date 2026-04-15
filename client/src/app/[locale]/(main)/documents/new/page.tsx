"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AttachFileSection } from "@/components/AttachFileSection";
import { extractApiError } from "@/lib/extractApiError";

type CreateMode = "text" | "file" | "url";

function initialCreateMode(searchParams: URLSearchParams): CreateMode {
  const m = searchParams.get("mode");
  if (m === "file") return "file";
  if (m === "url") return "url";
  return "text";
}

function isProPlan(plan: string | undefined) {
  return plan?.toLowerCase() === "pro";
}

export default function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isPro = isProPlan(user?.plan);

  const [mode, setMode] = useState<CreateMode>(() => initialCreateMode(searchParams));
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const { data } = await api.post("/api/documents", { title: title.trim(), content: content.trim() });
      router.push(`/documents/${data.data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(extractApiError(err) || "Could not create document.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitFile(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setError("Choose a PDF or DOCX file.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body = new FormData();
      body.append("title", title.trim());
      body.append("file", uploadFile);
      const { data } = await api.post("/api/documents/upload", body, { timeout: 120_000 });
      router.push(`/documents/${data.data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(
        extractApiError(err) ||
          "Upload failed. Check your connection, file size (max 10 MB), and that the file is a real PDF or DOCX."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    const trimmedUrl = pageUrl.trim();
    if (!trimmedUrl) {
      setError("Enter a page URL (https://…).");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body: { url: string; title?: string } = { url: trimmedUrl };
      const t = title.trim();
      if (t) body.title = t;
      const { data } = await api.post("/api/documents/from-url", body, { timeout: 90_000 });
      router.push(`/documents/${data.data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(
        extractApiError(err) ||
          "Could not import from this URL. The site may block requests, need JavaScript, or have no clear article body."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <nav className="mb-6 text-sm">
        <Link href="/documents" className="text-primary font-semibold hover:underline">
          ← Documents
        </Link>
      </nav>
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
        New document
      </h1>

      <fieldset className="mb-8 border-0 p-0">
        <legend className="sr-only">How to create</legend>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("text");
              setError(null);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "text"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Write text
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("file");
              setError(null);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "file"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Upload PDF / DOCX
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("url");
              setError(null);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === "url"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Import from URL
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {mode === "text" && "Create a document from your own text. It is indexed for search and chat."}
          {mode === "url" &&
            "Paste a public https link. We fetch the HTML and extract the main article (reader-style), which usually drops nav, sidebars, ads, and comments. JavaScript-only pages may not work."}
          {mode === "file" &&
            (isPro
              ? "Extract text from a file into a new document and index it for search and chat."
              : "File upload is included with Pro. You can still create documents by typing or importing from a URL.")}
        </p>
      </fieldset>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {mode === "text" && (
        <form onSubmit={(e) => void handleSubmitText(e)} className="space-y-5">
          <div>
            <label htmlFor="doc-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Title
            </label>
            <input
              id="doc-title"
              type="text"
              required
              maxLength={500}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label htmlFor="doc-content" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Content
            </label>
            <textarea
              id="doc-content"
              required
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[200px]"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? "Creating…" : "Create document"}
            </button>
            <Link
              href="/documents"
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {mode === "url" && (
        <form onSubmit={(e) => void handleSubmitUrl(e)} className="space-y-5">
          <div>
            <label htmlFor="import-page-url" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Page URL
            </label>
            <input
              id="import-page-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              required
              maxLength={2048}
              placeholder="https://example.com/article"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label htmlFor="import-doc-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Document title <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span>
            </label>
            <input
              id="import-doc-title"
              type="text"
              maxLength={500}
              placeholder="Leave blank to use the page title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? "Importing…" : "Import and create"}
            </button>
            <Link
              href="/documents"
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {mode === "file" && !isPro && (
        <section
          aria-labelledby="upgrade-upload-heading"
          className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 p-6 mb-6"
        >
          <h2 id="upgrade-upload-heading" className="text-lg font-bold text-amber-950 dark:text-amber-100 mb-2">
            Upload needs Pro
          </h2>
          <p className="text-sm text-amber-900/90 dark:text-amber-100/85 mb-4">
            On the Documents list, the upload button also goes here once you are on Pro. Upgrade to pull text from PDF or
            DOCX into a new document.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              View plans
            </Link>
            <button
              type="button"
              onClick={() => setMode("text")}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
            >
              Back to writing
            </button>
          </div>
        </section>
      )}

      {mode === "file" && isPro && (
        <form onSubmit={(e) => void handleSubmitFile(e)} className="space-y-5">
          <div>
            <label htmlFor="upload-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Document title
            </label>
            <input
              id="upload-title"
              type="text"
              required
              maxLength={500}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <AttachFileSection
            file={uploadFile}
            onFileChange={setUploadFile}
            disabled={saving}
            description="Choose one PDF or DOCX (up to 10 MB). Text is extracted into the new document."
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || !uploadFile}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? "Uploading…" : "Create from file"}
            </button>
            <Link
              href="/documents"
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
