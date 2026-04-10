"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as d3 from "d3";
import { useTheme } from "next-themes";

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  /** Short explanation of what this concept is (from AI, optional on old graphs) */
  description?: string;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  label: string;
}

interface Props {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

type SimNode = KnowledgeGraphNode & d3.SimulationNodeDatum;

const LABEL_MAX = 15;

function truncateLabel(label: string): string {
  return label.length > LABEL_MAX ? `${label.slice(0, LABEL_MAX - 2)}…` : label;
}

export function KnowledgeGraph({ nodes, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const markerId = `kg-arrow-${reactId.replace(/:/g, "")}`;
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodeDataRef = useRef<SimNode[]>([]);
  const { resolvedTheme } = useTheme();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const handleNodePickRef = useRef((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  });

  const isDark = resolvedTheme === "dark";
  const canvasFill = isDark ? "#0f172a" : "#ffffff";

  useEffect(() => {
    setSelectedId(null);
  }, [nodes, edges]);

  const fitToView = () => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;

    const data = nodeDataRef.current;
    if (data.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const d of data) {
      const x = d.x ?? 0;
      const y = d.y ?? 0;
      minX = Math.min(minX, x - 40);
      minY = Math.min(minY, y - 40);
      maxX = Math.max(maxX, x + 40);
      maxY = Math.max(maxY, y + 40);
    }
    const w = svgEl.clientWidth || 800;
    const h = svgEl.clientHeight || 500;
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const pad = 64;
    const scale = Math.min((w - pad) / bw, (h - pad) / bh, 1.8) * 0.92;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = w / 2 - scale * cx;
    const ty = h / 2 - scale * cy;
    d3.select(svgEl).transition().duration(450).call(z.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  };

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 500;

    d3.select(svgRef.current).selectAll("*").remove();
    zoomRef.current = null;

    const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);

    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomRef.current = zoom;
    svg.call(zoom);

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", canvasFill)
      .style("cursor", "grab")
      .lower()
      .on("click", () => setSelectedId(null));

    svg
      .append("defs")
      .append("marker")
      .attr("id", markerId)
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 28)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .append("path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#6366f1");

    const nodeMap = new Map<string, SimNode>(
      nodes.map((n) => [String(n.id), { ...n, x: width / 2, y: height / 2 }])
    );

    const linkData = edges
      .filter((e) => nodeMap.has(String(e.source)) && nodeMap.has(String(e.target)))
      .map((e) => ({
        source: nodeMap.get(String(e.source))!,
        target: nodeMap.get(String(e.target))!,
        label: e.label ?? "",
      }));

    const nodeData = Array.from(nodeMap.values());
    nodeDataRef.current = nodeData;

    const simulation = d3
      .forceSimulation(nodeData)
      .force(
        "link",
        d3
          .forceLink<SimNode, (typeof linkData)[0]>(linkData)
          .id((d) => String(d.id))
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(50));

    const link = g
      .append("g")
      .attr("class", "kg-links")
      .selectAll("line")
      .data(linkData)
      .join("line")
      .attr("stroke", "#6366f1")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("marker-end", `url(#${markerId})`);

    const linkLabel = g
      .append("g")
      .attr("class", "kg-link-labels")
      .selectAll("text")
      .data(linkData)
      .join("text")
      .attr("font-size", 10)
      .attr("fill", "rgb(148 163 184)")
      .attr("text-anchor", "middle")
      .text((d) => d.label);

    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const node = g
      .append("g")
      .attr("class", "kg-nodes")
      .selectAll<SVGGElement, SimNode>("g")
      .data(nodeData)
      .join((enter) => enter.append("g"))
      .style("cursor", "pointer")
      .call(dragBehavior)
      .on("click", (event: MouseEvent, d: SimNode) => {
        event.stopPropagation();
        handleNodePickRef.current(String(d.id));
      });

    node
      .append("circle")
      .attr("r", 28)
      .attr("fill", "#6366f1")
      .attr("fill-opacity", 0.15)
      .attr("stroke", "#6366f1")
      .attr("stroke-width", 2)
      .each(function (d: SimNode) {
        d3.select(this).append("title").text(d.label);
      })
      .on("mouseover", function (_event, d: SimNode) {
        const on =
          selectedIdRef.current !== null && String(d.id) === String(selectedIdRef.current);
        d3.select(this).attr("fill-opacity", on ? 0.4 : 0.35);
      })
      .on("mouseout", function (_event, d: SimNode) {
        const on =
          selectedIdRef.current !== null && String(d.id) === String(selectedIdRef.current);
        d3.select(this).attr("fill-opacity", on ? 0.32 : 0.15);
      });

    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", 11)
      .attr("fill", "currentColor")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .text((d) => truncateLabel(d.label));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      linkLabel
        .attr("x", (d) => (((d.source as SimNode).x ?? 0) + ((d.target as SimNode).x ?? 0)) / 2)
        .attr("y", (d) => (((d.source as SimNode).y ?? 0) + ((d.target as SimNode).y ?? 0)) / 2);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    const t = window.setTimeout(() => fitToView(), 380);

    return () => {
      window.clearTimeout(t);
      simulation.stop();
    };
  }, [nodes, edges, markerId, canvasFill]);

  useEffect(() => {
    const root = svgRef.current;
    if (!root) return;

    root.querySelectorAll<SVGGElement>(".kg-nodes g").forEach((group) => {
      const datum = d3.select(group).datum() as SimNode | undefined;
      if (!datum) return;
      const on = selectedId !== null && String(datum.id) === String(selectedId);
      const circle = group.querySelector("circle");
      if (circle) {
        circle.setAttribute("stroke-width", on ? "4" : "2");
        circle.setAttribute("fill-opacity", on ? "0.32" : "0.15");
        circle.setAttribute("stroke", on ? "#818cf8" : "#6366f1");
      }
    });
  }, [selectedId, nodes, edges]);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const ro = new ResizeObserver(() => {
      const svg = svgRef.current;
      if (!svg) return;
      const w = containerRef.current?.clientWidth ?? 800;
      const h = containerRef.current?.clientHeight ?? 500;
      d3.select(svg).attr("width", w).attr("height", h);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [nodes.length]);

  if (nodes.length === 0) {
    return (
      <section
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-12 text-center text-slate-500 dark:text-slate-400"
        aria-live="polite"
      >
        <p className="text-sm font-medium">No concepts to display. Try generating the graph again.</p>
      </section>
    );
  }

  const selected = selectedId ? nodes.find((n) => String(n.id) === String(selectedId)) : null;
  const outgoing =
    selectedId == null ? [] : edges.filter((e) => String(e.source) === String(selectedId));
  const incoming =
    selectedId == null ? [] : edges.filter((e) => String(e.target) === String(selectedId));

  return (
    <section
      className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden min-h-[520px] lg:min-h-[560px] lg:flex-row"
      aria-label="Knowledge graph"
    >
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[480px] min-w-0 bg-slate-50 dark:bg-slate-950/50"
      >
        <svg
          ref={svgRef}
          className="block w-full h-full min-h-[480px] cursor-grab touch-none text-slate-800 dark:text-slate-100"
          aria-label="Knowledge graph: drag nodes, click for details, scroll to zoom"
        />

        <div
          className="absolute left-4 bottom-4 flex flex-col gap-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-1 shadow-lg shadow-slate-900/5 dark:shadow-black/40 backdrop-blur-sm"
          role="toolbar"
          aria-label="Graph zoom controls"
        >
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Zoom in"
            onClick={() => {
              const svgEl = svgRef.current;
              const z = zoomRef.current;
              if (!svgEl || !z) return;
              d3.select(svgEl).transition().duration(200).call(z.scaleBy, 1.25);
            }}
          >
            <span className="material-symbols-outlined text-xl leading-none">add</span>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Zoom out"
            onClick={() => {
              const svgEl = svgRef.current;
              const z = zoomRef.current;
              if (!svgEl || !z) return;
              d3.select(svgEl).transition().duration(200).call(z.scaleBy, 0.8);
            }}
          >
            <span className="material-symbols-outlined text-xl leading-none">remove</span>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fit graph to view"
            onClick={() => fitToView()}
          >
            <span className="material-symbols-outlined text-xl leading-none">fit_screen</span>
          </button>
        </div>

        <p className="pointer-events-none absolute right-4 top-3 max-w-[200px] text-right text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Scroll to zoom · Drag nodes
        </p>
      </div>

      <aside
        className="flex w-full flex-col border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 lg:w-[min(100%,400px)] lg:max-w-md lg:shrink-0 lg:border-l lg:border-t-0 shadow-[0_-8px_30px_-15px_rgba(15,23,42,0.2)] dark:shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.5)]"
        aria-label="Concept details"
      >
        {selected ? (
          <div className="flex max-h-[min(70vh,560px)] flex-col lg:max-h-none lg:flex-1">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Concept (full text)
                </p>
                <h2 className="mt-1 text-lg font-bold leading-snug text-slate-900 dark:text-slate-100 wrap-break-word">
                  {selected.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                aria-label="Close details"
              >
                <span className="material-symbols-outlined text-xl leading-none">close</span>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {selected.description?.trim() ? (
                <section className="mb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    About this concept
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 wrap-break-word">
                    {selected.description.trim()}
                  </p>
                </section>
              ) : (
                <p className="mb-6 text-sm text-slate-400 dark:text-slate-500">
                  No description for this concept yet.
                </p>
              )}

              {(outgoing.length > 0 || incoming.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-1">
                  {outgoing.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                        Outgoing
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        {outgoing.map((e, i) => {
                          const to = nodes.find((n) => String(n.id) === String(e.target));
                          return (
                            <li key={`o-${i}`} className="wrap-break-word">
                              <button
                                type="button"
                                onClick={() => to && setSelectedId(String(to.id))}
                                disabled={!to}
                                className="w-full rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:cursor-default disabled:opacity-60 dark:hover:bg-primary/10"
                              >
                                <span className="text-slate-500 dark:text-slate-500">{e.label || "relates to"}</span>
                                <span className="text-slate-400 dark:text-slate-500"> → </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {to?.label ?? e.target}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}
                  {incoming.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                        Incoming
                      </h3>
                      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        {incoming.map((e, i) => {
                          const from = nodes.find((n) => String(n.id) === String(e.source));
                          return (
                            <li key={`i-${i}`} className="wrap-break-word">
                              <button
                                type="button"
                                onClick={() => from && setSelectedId(String(from.id))}
                                disabled={!from}
                                className="w-full rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-3 py-2 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 disabled:cursor-default disabled:opacity-60 dark:hover:bg-primary/10"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {from?.label ?? e.source}
                                </span>
                                <span className="text-slate-500 dark:text-slate-500">
                                  {" "}
                                  ({e.label || "relates to"})
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-3">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Click the same node again to collapse. Hover a node on the graph for a quick tooltip.
              </p>
            </footer>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="material-symbols-outlined mb-3 text-4xl text-slate-300 dark:text-slate-600">
              touch_app
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Select a concept</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Click any node on the graph to see the full name, description, and outgoing / incoming links in
              this panel.
            </p>
          </div>
        )}
      </aside>
    </section>
  );
}
