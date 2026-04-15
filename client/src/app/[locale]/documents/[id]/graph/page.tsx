"use client";

import { useCallback, useEffect, useState, use } from "react";
import { Link } from "@/i18n/navigation";
import { Sidebar } from "@/components/Sidebar";
import { AiGeneratingPanel } from "@/components/AiGeneratingPanel";
import { DocumentFeatureEmptyState } from "@/components/DocumentFeatureEmptyState";
import { DocumentFeatureHeader } from "@/components/DocumentFeatureHeader";
import { KnowledgeGraph, type KnowledgeGraphEdge, type KnowledgeGraphNode } from "@/components/KnowledgeGraph";
import { api } from "@/lib/api";
import { extractApiError } from "@/lib/extractApiError";

const KG_LANG_STORAGE_KEY = "docipy.knowledgeGraphLang";
type GraphLang = "en" | "th";

interface GraphPayload {
  id: string;
  document_id: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  created_at?: string;
}

function normalizeGraph(raw: unknown): GraphPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nodes = Array.isArray(o.nodes) ? o.nodes : [];
  const edges = Array.isArray(o.edges) ? o.edges : [];
  return {
    id: String(o.id ?? ""),
    document_id: String(o.document_id ?? ""),
    nodes: nodes.map((n) => {
      const x = n as Record<string, unknown>;
      const desc = x.description;
      return {
        id: String(x.id ?? ""),
        label: String(x.label ?? x.id ?? ""),
        ...(typeof desc === "string" && desc.trim() ? { description: desc.trim() } : {}),
      };
    }),
    edges: edges.map((e) => {
      const x = e as Record<string, unknown>;
      return {
        source: String(x.source ?? ""),
        target: String(x.target ?? ""),
        label: String(x.label ?? ""),
      };
    }),
    created_at: typeof o.created_at === "string" ? o.created_at : undefined,
  };
}

export default function KnowledgeGraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [graphLang, setGraphLangState] = useState<GraphLang>("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem(KG_LANG_STORAGE_KEY);
      if (s === "th" || s === "en") setGraphLangState(s);
    } catch {
      /* ignore */
    }
  }, []);

  function setGraphLang(next: GraphLang) {
    setGraphLangState(next);
    try {
      localStorage.setItem(KG_LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

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

  const loadGraph = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/documents/${id}/knowledge-graph`);
      setGraph(normalizeGraph(data.data));
    } catch {
      setGraph(null);
    }
  }, [id]);

  useEffect(() => {
    void loadDoc();
  }, [loadDoc]);

  useEffect(() => {
    if (docTitle === null && !loadError) return;
    if (loadError) return;
    void loadGraph();
  }, [docTitle, loadError, loadGraph]);

  async function generateGraph(regenerate: boolean) {
    setIsLoading(true);
    setActionError("");
    try {
      const params = new URLSearchParams();
      params.set("lang", graphLang);
      if (regenerate) params.set("regenerate", "true");
      const url = `/api/documents/${id}/knowledge-graph?${params.toString()}`;
      const { data } = await api.post(url);
      setGraph(normalizeGraph(data.data));
    } catch (err) {
      setActionError(extractApiError(err) || "Failed to generate knowledge graph.");
    } finally {
      setIsLoading(false);
    }
  }

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
    <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col">
        <DocumentFeatureHeader
          documentId={id}
          title={docTitle}
          sectionLabel="Knowledge graph"
          icon="account_tree"
          actions={
            graph ? (
              <button
                type="button"
                onClick={() => void generateGraph(true)}
                disabled={isLoading}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Generating..." : "Regenerate"}
              </button>
            ) : undefined
          }
        />

        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Visual map of key concepts and their relationships. Drag nodes, scroll to zoom; details open in the
            panel on the right.
          </p>

          <fieldset
            disabled={isLoading}
            className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/50 px-4 py-3 disabled:opacity-60"
          >
            <legend className="px-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              Graph language (AI output)
            </legend>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Choose before{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">Generate</span> or{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">Regenerate</span>. Labels,
              descriptions, and edge text follow this language.
            </p>
            <div
              className="inline-flex gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-600 dark:bg-slate-800"
              role="group"
              aria-label="Knowledge graph output language"
            >
              <button
                type="button"
                aria-pressed={graphLang === "en"}
                onClick={() => setGraphLang("en")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  graphLang === "en"
                    ? "bg-primary text-white dark:text-white"
                    : "text-slate-800 hover:bg-white/90 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                English
              </button>
              <button
                type="button"
                aria-pressed={graphLang === "th"}
                onClick={() => setGraphLang("th")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  graphLang === "th"
                    ? "bg-primary text-white dark:text-white"
                    : "text-slate-800 hover:bg-white/90 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                ไทย
              </button>
            </div>
          </fieldset>

          {actionError ? (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-sm" role="alert">
              {actionError}
            </div>
          ) : null}

          {graph ? (
            isLoading ? (
              <AiGeneratingPanel
                title="Building your knowledge graph..."
                description="This can take up to a minute. Stay on this page while we refresh labels, descriptions, and connections from your document."
              />
            ) : (
              <>
                <KnowledgeGraph nodes={graph.nodes} edges={graph.edges} />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
                  {graph.nodes.length} concepts · {graph.edges.length} connections
                </p>
              </>
            )
          ) : (
            <DocumentFeatureEmptyState
              icon="account_tree"
              title="No knowledge graph yet"
              description="Generate a visual map of key concepts and how they connect, based on this document. Pick graph language above, then create."
              loading={isLoading}
              generatingTitle="Building your knowledge graph..."
              generatingDescription="This can take up to a minute. Stay on this page while we map concepts and relationships from your document."
              primaryAction={
                <button
                  type="button"
                  onClick={() => void generateGraph(false)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary/90 disabled:opacity-60"
                >
                  Generate graph
                </button>
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
