"use client";

import { Fragment, useEffect, useState } from "react";
import type { HostedDataset, LineageSubgraph, ResultSpec, SessionNode, SessionTree, DiveSpace } from "@/lib/types";
import type { Lens } from "@/components/workspace/types";
import { Figure } from "@/components/workspace/figure";
import { resultHeroFigure, signalFigure, spreadFigure, candleFigure, featureWeightsFigure, regimeFigure, correlationFigure, drillUnderneath } from "@/lib/figures";
import { deriveValidator, validatorOk } from "@/lib/data";
import { pathTo, childrenOf, questionAncestor } from "@/lib/session-tree";
import { StarIcon } from "@/components/workspace/icons";

/** Read a model spec's learned coefficients (free-form dict) → typed weights. */
function readCoefficients(spec: unknown): Record<string, number> | null {
  if (!spec || typeof spec !== "object") return null;
  const co = (spec as { coefficients?: unknown }).coefficients;
  if (!co || typeof co !== "object") return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(co)) if (typeof v === "number") out[k] = v;
  return Object.keys(out).length ? out : null;
}

/** A plain-language headline for the feature weights — the dominant signal, and
 *  the one that leans against it. */
function droveHeadline(coefs: Record<string, number>, labelFor: (k: string) => string): string {
  const e = Object.entries(coefs).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const top = e[0];
  const neg = e.find((x) => x[1] < 0);
  const topL = labelFor(top[0]);
  return neg && neg[0] !== top[0]
    ? `${topL} carries the signal — ${labelFor(neg[0])} leans against it.`
    : `${topL} carries the signal.`;
}

/** A month label that degrades to the raw timestamp on a non-date `t` — matching
 *  the guard the figure axes already use, so captions never read "Invalid Date". */
function monthLabel(t: string): string {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? t : d.toLocaleString("en-US", { month: "long" });
}

/** The series a dive space reads. `raw` is a zoomed-in session, not part of the
 *  aligned-by-date family, so it has no entry here. */
function seriesFor(spec: ResultSpec, space: DiveSpace): { t: string }[] | undefined {
  return space === "return" ? spec.equitySeries : space === "signal" ? spec.signalSeries : space === "spread" ? spec.spreadSeries : undefined;
}
/** Nearest index in `series` to timestamp `t` (clamped, NaN-safe). */
function nearestIdxByT(series: { t: string }[] | undefined, t?: string): number {
  if (!series?.length || !t) return 0;
  const target = new Date(t).getTime();
  if (Number.isNaN(target)) return 0;
  let best = 0, bestD = Infinity;
  series.forEach((p, k) => { const d = Math.abs(new Date(p.t).getTime() - target); if (d < bestD) { bestD = d; best = k; } });
  return best;
}
/** Translate a dive index from one space's series to the next BY TIMESTAMP — the
 *  equity / signal / spread series needn't share length or dates, so reusing the
 *  raw integer index would drill to the wrong bar (bug fix). `raw` isn't
 *  date-aligned (it's one zoomed session), so it keeps the index untranslated. */
function mapDiveIndex(spec: ResultSpec, from: DiveSpace, fromIdx: number, to: DiveSpace): number {
  if (to === "raw") return fromIdx;
  const src = seriesFor(spec, from);
  const i = src ? Math.max(0, Math.min(src.length - 1, fromIdx)) : fromIdx;
  return nearestIdxByT(seriesFor(spec, to), src?.[i]?.t);
}

const REGIME_WORD: Record<string, string> = { MR: "mean-reverting", UP: "trending-up", DOWN: "trending-down", NO_TRADE: "flat" };

/** A plain-language headline for the regime ribbon — what ruled, and the catch. */
function regimeHeadline(series: { state: string }[]): string {
  const counts: Record<string, number> = {};
  for (const r of series) counts[r.state] = (counts[r.state] ?? 0) + 1;
  const dom = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "MR";
  if (dom === "MR" && series.some((r) => r.state === "DOWN"))
    return "It paid in mean-reverting weeks — and gave it back when the market trended.";
  return `${REGIME_WORD[dom] ?? dom} weeks dominated the window.`;
}

/** Longest-path depth over data edges — chronological build order. */
function depths(sg: LineageSubgraph): Record<string, number> {
  const parents: Record<string, string[]> = {};
  const isPolicy = (id: string) => sg.nodes.find((n) => n.id === id)?.kind === "policy";
  for (const n of sg.nodes) parents[n.id] = [];
  for (const e of sg.edges) if (parents[e.childId] && !isPolicy(e.parentId)) parents[e.childId].push(e.parentId);
  const d: Record<string, number> = {};
  const visit = (id: string, seen: Set<string>): number => {
    if (d[id] != null) return d[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents[id] ?? [];
    d[id] = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
    return d[id];
  };
  for (const n of sg.nodes) visit(n.id, new Set());
  return d;
}

const KIND_TAG: Record<string, string> = {
  dataset: "DATASET", "raw-dataset": "DATASET", feature: "FEATURE", matrix: "MATRIX",
  target: "TARGET", model: "MODEL", result: "RESULT", strategy: "STRATEGY",
  universe: "UNIVERSE", figure: "FIGURE",
};

const METRIC_LABEL: Record<string, string> = {
  sharpe: "Sharpe", hit_rate: "Hit rate", max_drawdown: "Max DD", turnover: "Turnover",
  ann_return: "Ann. return", flagged: "Flagged", max_z: "Max z", share_pct: "Share",
  ann_vol: "Ann. vol", vol_of_vol: "Vol of vol", max_20d: "Max 20d",
};
function fmtMetric(k: string, v: number) {
  if (k === "max_drawdown" || k === "ann_return" || k === "ann_vol" || k === "max_20d" || k === "share_pct" || k === "hit_rate") return `${(v * 100).toFixed(1)}%`;
  if (k === "flagged") return String(v);
  return v.toFixed(2);
}

/** A plain-language one-liner from the result's numbers — what a newcomer reads first. */
function plainHeadline(spec: ResultSpec): string {
  const m = spec.metrics;
  const bits: string[] = [];
  if (typeof m.sharpe === "number") bits.push(`about ${m.sharpe.toFixed(1)}× return per unit of risk`);
  if (typeof m.ann_return === "number") bits.push(`${(m.ann_return * 100).toFixed(0)}% a year`);
  if (typeof m.flagged === "number") bits.push(`${m.flagged} flagged`);
  return bits.length ? `${spec.friendlyName} — ${bits.join(", ")}.` : `${spec.friendlyName}.`;
}

type ChapterDef = { id: string; title: string; ok: boolean };

// the dive: a PATH down the session tree — a return point opens into the signal
// that made it, that into the spread underneath, down to the raw bars (ADR D1/D4).
// Backtracking then diving elsewhere forks (the old branch is kept), never amputates.
const SPACE_LABEL: Record<string, string> = { return: "return", signal: "signal space", spread: "spread space", raw: "raw bars" };
const DIVE_NUM = ["①", "②", "③", "④", "⑤"];

/** The navigable spine of the research story — sticky, click-to-jump, highlights
 *  the chapter you're reading (scroll-spy in the parent). */
function ChapterRail({ chapters, active, onJump, meta }: { chapters: ChapterDef[]; active?: string; onJump: (id: string) => void; meta?: string }) {
  return (
    <nav className="hidden md:block sticky top-2 self-start">
      <p className="font-mono text-meta uppercase tracking-[0.16em] text-faint mb-3">contents</p>
      <div className="flex flex-col">
        {chapters.map((c, i) => {
          const on = active === c.id;
          return (
            <button key={c.id} onClick={() => onJump(c.id)} className={`flex gap-2 items-baseline text-left py-1.5 pl-3 -ml-px border-l-2 transition-colors ${on ? "border-clay" : "border-hairline hover:border-hairline-2"}`}>
              <span className={`font-mono text-micro ${on ? "text-clay" : "text-faint"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={`text-ui ${on ? "text-ink font-medium" : "text-muted"}`}>{c.title}</span>
            </button>
          );
        })}
      </div>
      {meta && <p className="mt-4 font-mono text-micro text-faint leading-relaxed">{meta}</p>}
    </nav>
  );
}

/** One stat in the finding's KPI strip — the hero metric large, the rest quiet. */
function Kpi({ v, k, big, tone }: { v: string; k: string; big?: boolean; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className={`font-mono tabular-nums leading-none ${big ? "text-display" : "text-h2"} ${tone === "pos" ? "text-green" : tone === "neg" ? "text-clay" : "text-ink"}`}>{v}</div>
      <div className="mt-1.5 font-mono text-meta uppercase tracking-[0.13em] text-muted">{k}</div>
    </div>
  );
}

/** Progressive depth: the heavy diagnostics hide behind one "evidence ▾" control. */
function Evidence({ label, children }: { label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t border-dashed border-hairline-2 pt-3">
      <button onClick={() => setOpen((o) => !o)} className="font-mono text-meta text-muted hover:text-ink transition-colors">
        the evidence {open ? "▴" : "▾"}{label && <span className="text-faint"> · {label}</span>}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/**
 * The Insight lens as a chaptered research story (Phase 1). A sticky chapter rail
 * over a top-to-bottom narrative; each chapter LEADS with one visualization and a
 * one-line thesis; heavy diagnostics live behind "evidence ▾". Chapters are
 * DATA-GATED — only the ones with real data render, so the story's length matches
 * the research depth (no fabricated chapters).
 */
export function WorkflowNarrative({
  graph,
  labels,
  producerOps,
  resultSpecs,
  datasets,
  building,
  buildingLabel,
  buildingOp,
  onOpenNode,
  onOpenLens,
  onNextStep,
  diveTree,
  onDive,
  onNavigateDive,
  onPin,
}: {
  graph: LineageSubgraph;
  labels: Record<string, string>;
  producerOps: Record<string, string>;
  resultSpecs: Record<string, ResultSpec>;
  datasets: Record<string, HostedDataset>;
  building: boolean;
  buildingLabel?: string;
  buildingOp?: string;
  workspaceName: string;
  onOpenNode: (id: string) => void;
  onOpenLens?: (l: Lens) => void;
  onNextStep?: (prompt: string) => void;
  // the dive-as-tree (M-P): the session tree (root = the finding), and the
  // dispatchers that fork/navigate it. Absent ⇒ dive affordances are inert.
  diveTree?: SessionTree | null;
  onDive?: (parentId: string, space: DiveSpace, index: number) => void;
  onNavigateDive?: (nodeId: string) => void;
  onPin?: (nodeId: string, annotation?: string) => void;
}) {
  const d = depths(graph);
  const flow = graph.nodes.filter((n) => n.kind !== "policy").sort((a, b) => (d[a.id] ?? 0) - (d[b.id] ?? 0));
  const result = [...flow].reverse().find((n) => n.kind === "result");
  const spec = result ? resultSpecs[result.id] : undefined;
  const validator = result && result.kind !== "dataset" && result.kind !== "raw-dataset" ? deriveValidator(result, graph) : undefined;
  const ok = validator ? validatorOk(validator) : false;

  const labelForFeature = (key: string) => {
    const fn = graph.nodes.find((n) => n.name === key);
    return fn ? labels[fn.id] ?? key : key;
  };

  // what drove it — the model's learned weights
  const modelNode = flow.find((n) => n.kind === "model");
  const coefs = readCoefficients(modelNode?.spec);
  const weightsFig = coefs ? featureWeightsFigure(coefs, labelForFeature) : null;
  const modelLabel = modelNode ? labels[modelNode.id] ?? modelNode.name : undefined;
  const modelSpec = (modelNode?.spec ?? {}) as { kind?: string; alpha?: number; target?: string };
  // the finding's hero chart (annotated, regime-shaded) + the regime ribbon
  const heroFig = spec ? resultHeroFigure(spec) : null;
  const regimeFig = spec ? regimeFigure(spec) : null;
  // the factors — the matrix's authored correlation + the feature inputs
  const featureNodes = flow.filter((n) => n.kind === "feature");
  const matrixNode = flow.find((n) => n.kind === "matrix");
  const corrFig = matrixNode ? correlationFigure(matrixNode.spec) : null;

  // ── data-gated chapters: only the ones we have honest data for ──
  const chapters: ChapterDef[] = [
    { id: "finding", title: "The finding", ok: !!(result && spec) },
    { id: "factors", title: "The factors", ok: !!(corrFig && featureNodes.length) },
    { id: "model", title: "What drove it", ok: !!(weightsFig && coefs) },
    { id: "regime", title: "When it works", ok: !!(regimeFig && spec?.regimeSeries) },
    { id: "recipe", title: "How it was built", ok: flow.length > 0 },
  ].filter((c) => c.ok);
  const num = (id: string) => String(chapters.findIndex((c) => c.id === id) + 1).padStart(2, "0");

  // dive: the active path down the session tree — root (the finding) → signal →
  // spread → raw. `divePath` drops the root, so each entry is one dive level with
  // a `view.dive` of {space,index}. Empty ⇒ not diving. (Forks live in the tree;
  // backtracking is non-destructive — the abandoned branch stays reachable.)
  const canDive = !!(diveTree && onDive);
  // dives hang beneath the QUESTION you're in (the trunk node), not the tree root —
  // so a follow-up question gets its own fresh dive space.
  const qRootId = diveTree ? questionAncestor(diveTree, diveTree.currentId) : undefined;
  const fullPath: SessionNode[] = diveTree ? pathTo(diveTree, diveTree.currentId) : [];
  const qIdx = qRootId ? fullPath.findIndex((n) => n.id === qRootId) : -1;
  const divePath: SessionNode[] = qIdx >= 0 ? fullPath.slice(qIdx + 1) : [];
  // the space beneath the finding itself — what the hero's points dive into
  // (resolver-driven, so the chain lives in one place — M-R).
  const heroBelow: DiveSpace | null = spec ? drillUnderneath("return", spec) : null;
  // scroll-spy: highlight the chapter currently near the top of the canvas
  const [active, setActive] = useState<string | undefined>(undefined);
  const ids = chapters.map((c) => c.id).join(",");
  useEffect(() => {
    const list = ids ? ids.split(",") : [];
    if (!list.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target.getAttribute("data-chapter"));
        const first = list.find((id) => visible.includes(id));
        if (first) setActive(first);
      },
      { rootMargin: "-12% 0px -76% 0px", threshold: 0 },
    );
    for (const id of list) {
      const el = document.getElementById(`ch-${id}`);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [ids]);
  const activeId = active && chapters.some((c) => c.id === active) ? active : chapters[0]?.id;
  const jump = (id: string) => {
    document.getElementById(`ch-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  if (chapters.length === 0) {
    return (
      <div className="px-6 py-10 max-w-[680px] mx-auto">
        <p className="text-body text-muted">{building ? "building the graph…" : "nothing built yet — describe what to build in the conversation."}</p>
      </div>
    );
  }

  const figureCount = [heroFig, corrFig, weightsFig, regimeFig].filter(Boolean).length;

  // the dive cascade: each path node → its space's figure + a derived caption.
  const diveViews = divePath.map((node) => {
    const space = node.view.dive?.space;
    const index = node.view.dive?.index ?? 0;
    if (space === "signal" && spec && spec.signalSeries) {
      const sig = spec.signalSeries;
      const fi = Math.max(0, Math.min(sig.length - 1, index));
      const month = monthLabel(sig[fi].t);
      const win = sig.slice(Math.max(0, fi - 3), fi + 4);
      const avgZ = win.reduce((a, b) => a + b.z, 0) / (win.length || 1);
      const extended = Math.abs(avgZ) > 1.8;
      const msg = extended
        ? `Around ${month}, the z-score sat at ${avgZ >= 0 ? "+" : ""}${avgZ.toFixed(1)}σ — pinned past its band. The z-score is just the spread standardized; underneath is the spread itself.`
        : `Around ${month}, the z-score held inside ±2σ. Underneath is the spread it standardizes.`;
      return { fig: signalFigure(spec, fi), where: `inside the ${month} point`, msg, below: drillUnderneath("signal", spec) };
    }
    if (space === "spread" && spec && spec.spreadSeries) {
      const sp = spec.spreadSeries;
      const fi = Math.max(0, Math.min(sp.length - 1, index));
      const month = monthLabel(sp[fi].t);
      const w = sp.slice(Math.max(0, fi - 4), fi + 1).map((p) => p.spread);
      const mean = w.reduce((a, b) => a + b, 0) / (w.length || 1);
      const dev = sp[fi].spread - mean;
      const far = Math.abs(dev) > 0.8;
      const msg = far
        ? `Around ${month}, the spread sat ${dev >= 0 ? "+" : ""}${dev.toFixed(1)} from its mean — it trended away instead of reverting. Underneath: the raw WTI bars its crude leg is built from.`
        : `Around ${month}, the spread hugged its mean. Underneath: the raw WTI bars.`;
      return { fig: spreadFigure(spec, fi), where: `inside the ${month} point`, msg, below: drillUnderneath("spread", spec) };
    }
    if (space === "raw" && spec && spec.rawCandles) {
      return {
        fig: candleFigure(spec),
        where: "the Mar 14 session",
        msg: "The raw 1-minute bars — crude_oil_1m, ~3.8M rows. This is the floor: everything above was built from here. (The gas leg traces down the same way.)",
        below: drillUnderneath("raw", spec),
      };
    }
    return null;
  });

  return (
    <div className="px-6 md:px-8 py-7 max-w-[1280px] mx-auto">
      <div className="grid md:grid-cols-[164px_1fr] gap-7 md:gap-9 items-start">
        <ChapterRail
          chapters={chapters}
          active={activeId}
          onJump={jump}
          meta={`${chapters.length} chapters · ${figureCount} figure${figureCount === 1 ? "" : "s"}${ok ? " · validated" : ""}`}
        />

        <div className="min-w-0 space-y-9">
          {/* ── 01 · THE FINDING — one big annotated chart is the hero ── */}
          {result && spec && (
            <section id="ch-finding" data-chapter="finding" className="scroll-mt-4">
              <div className="flex items-end justify-between gap-6 flex-wrap mb-3">
                <div className="max-w-[58ch]">
                  <p className="eyebrow text-clay">{num("finding")} · the finding</p>
                  <h2 className="mt-1.5 font-serif text-h3 font-medium text-ink-2 leading-snug">{plainHeadline(spec)}</h2>
                </div>
                <div className="flex items-baseline gap-7 shrink-0">
                  {typeof spec.metrics.sharpe === "number" && <Kpi v={fmtMetric("sharpe", spec.metrics.sharpe)} k="Sharpe" big />}
                  {typeof spec.metrics.ann_return === "number" && <Kpi v={fmtMetric("ann_return", spec.metrics.ann_return)} k="ann." />}
                  {typeof spec.metrics.max_drawdown === "number" && <Kpi v={fmtMetric("max_drawdown", spec.metrics.max_drawdown)} k="max dd" tone="neg" />}
                  {typeof spec.metrics.hit_rate === "number" && <Kpi v={fmtMetric("hit_rate", spec.metrics.hit_rate)} k="win" />}
                </div>
              </div>
              <div className="ticks border border-hairline bg-paper p-4">
                <div className="flex items-center justify-between gap-3 px-1 mb-1.5 font-mono text-meta text-faint">
                  <span className="min-w-0 truncate">{heroFig?.caption ?? ""}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    {onPin && qRootId && (
                      <button
                        onClick={() => onPin(qRootId, plainHeadline(spec))}
                        title="pin this finding to the pinboard — your deliverable (bottom-right of the workspace)"
                        className={`btn-press inline-flex items-center gap-1.5 font-mono text-meta uppercase tracking-[0.1em] border px-2 py-0.5 ${diveTree?.nodes[qRootId]?.pinned ? "border-clay text-clay bg-clay-wash" : "border-clay/55 text-clay hover:bg-clay hover:text-paper"}`}
                      >
                        {diveTree?.nodes[qRootId]?.pinned ? <>pinned <StarIcon filled className="h-3 w-3" /></> : <>pin <StarIcon className="h-3 w-3" /></>}
                      </button>
                    )}
                    <button onClick={() => onOpenNode(result.id)} className="hover:text-clay transition-colors">inspect ▸</button>
                  </span>
                </div>
                <Figure
                  spec={heroFig ? { ...heroFig, caption: undefined } : null}
                  onPick={canDive && heroBelow && qRootId ? (i) => onDive!(qRootId, heroBelow, mapDiveIndex(spec, "return", i, heroBelow)) : undefined}
                  selected={divePath[0]?.view.dive?.index}
                />
                {canDive && heroBelow && (
                  <p className="mt-2 px-1 font-mono text-meta text-faint">↑ click any point to trace it down — {heroBelow} → spread → the raw 1-minute bars. Nothing is hidden.</p>
                )}
              </div>
              {diveViews.map((v, depth) => {
                if (!v) return null;
                const node = divePath[depth];
                const path = ["return", ...divePath.slice(0, depth + 1).map((n) => n.view.dive?.space ?? "return")];
                const below = v.below;
                // sibling branches at this fork point (same parent) — backtracking
                // and diving elsewhere keeps the old one, so >1 means a fork.
                const siblings = diveTree && node.parentId ? childrenOf(diveTree, node.parentId) : [];
                return (
                  <div key={node.id} className="trace-descend relative mt-3 border border-hairline border-l-2 border-l-clay bg-paper p-4">
                    {/* the trace thread — a clay spine connecting this layer to the
                        one above, so the dive reads as one continuous fall (ADR D4) */}
                    <span aria-hidden className="trace-thread absolute left-[-2px] -top-3 h-3 w-[2px] bg-clay" />
                    <span aria-hidden className="absolute left-[-5px] -top-[5px] h-2 w-2 rounded-full bg-clay" />
                    <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                      <p className="font-mono text-meta uppercase tracking-[0.12em]">
                        {path.map((sp, k) => (
                          <Fragment key={k}>
                            {k > 0 && <span className="text-hairline-2"> ▸ </span>}
                            <span className={k === path.length - 1 ? "text-clay" : "text-faint"}>{DIVE_NUM[k] ?? "·"} {SPACE_LABEL[sp] ?? sp}</span>
                          </Fragment>
                        ))}
                        <span className="text-faint normal-case tracking-normal"> · {v.where}</span>
                      </p>
                      <button onClick={() => onNavigateDive?.(node.parentId!)} className="font-mono text-meta text-muted hover:text-ink transition-colors">↑ back</button>
                    </div>
                    {siblings.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                        <span className="font-mono text-micro uppercase tracking-[0.12em] text-faint">⑂ {siblings.length} branches</span>
                        {siblings.map((sib) => {
                          const on = sib.id === node.id;
                          return (
                            <button
                              key={sib.id}
                              onClick={() => onNavigateDive?.(sib.id)}
                              className={`font-mono text-micro px-1.5 py-0.5 border transition-colors ${on ? "border-clay text-clay bg-clay-wash" : "border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
                            >
                              {SPACE_LABEL[sib.view.dive?.space ?? "return"]} · {sib.view.dive?.index ?? 0}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <Figure
                      spec={v.fig}
                      onPick={below && canDive ? (j) => onDive!(node.id, below, mapDiveIndex(spec, node.view.dive?.space ?? "return", j, below)) : undefined}
                      selected={divePath[depth + 1]?.view.dive?.index}
                    />
                    {below && canDive && <p className="mt-2 px-1 font-mono text-meta text-faint">↑ click a point to dive into the {below} underneath{siblings.length > 1 ? " — forks a new branch, keeps this one" : ""}</p>}
                    <p className="mt-2.5 text-ui leading-snug text-ink-2 max-w-[66ch]">{v.msg}</p>
                  </div>
                );
              })}
              {spec.nextProposal && (() => {
                const np = spec.nextProposal;
                if (np.kind === "none" || !onNextStep) return null;
                return (
                  <button onClick={() => onNextStep(np.summary)} className="group mt-2 w-full flex items-center gap-3.5 bg-clay text-paper px-4 py-2.5 hover:bg-clay-deep transition-colors text-left">
                    <span className="font-mono text-meta uppercase tracking-[0.14em] text-paper/70 shrink-0">next move</span>
                    <span className="text-ui leading-snug min-w-0">{np.summary}</span>
                    <span className="ml-auto font-mono text-meta tracking-[0.08em] shrink-0">run this next →</span>
                  </button>
                );
              })()}
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <span className={`font-mono text-meta ${ok ? "text-green" : "text-clay"}`}>{ok ? "validated" : "blocked"}</span>
                {ok && <><span className="font-mono text-meta text-muted">no look-ahead</span><span className="font-mono text-meta text-muted">reproducible</span></>}
                <span className="ml-auto flex items-center gap-4">
                  {chapters.some((c) => c.id === "recipe") && <button onClick={() => jump("recipe")} className="font-mono text-meta text-muted hover:text-ink transition-colors">how it was built ▸</button>}
                  {onOpenLens && <button onClick={() => onOpenLens("code")} className="font-mono text-meta text-muted hover:text-ink transition-colors">the code ▸</button>}
                </span>
              </div>
              <Evidence label="all metrics · provenance">
                <div className="grid grid-cols-2 sm:grid-cols-4 border border-hairline divide-x divide-y divide-hairline">
                  {Object.entries(spec.metrics).map(([k, v]) => (
                    <div key={k} className="px-3 py-2.5">
                      <div className="font-mono text-h3 text-ink tabular-nums">{fmtMetric(k, v)}</div>
                      <div className="mt-0.5 font-mono text-micro uppercase tracking-[0.1em] text-muted">{METRIC_LABEL[k] ?? k}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-mono text-meta text-faint">eval {spec.evalWindow.start} → {spec.evalWindow.end}{result.lineageHash ? ` · lineage ${result.lineageHash}` : ""}</p>
              </Evidence>
            </section>
          )}

          {/* ── THE FACTORS ── */}
          {corrFig && featureNodes.length > 0 && (() => {
            const off = corrFig.data.filter((x) => x.row !== x.col);
            const top = off.length ? off.reduce((a, b) => (Math.abs(Number(b.v)) > Math.abs(Number(a.v)) ? b : a)) : null;
            const headline = top
              ? `${labelForFeature(String(top.row))} and ${labelForFeature(String(top.col))} ${Number(top.v) >= 0 ? "move together" : "pull apart"} — the rest are nearly independent.`
              : "The signals that feed the model.";
            return (
              <section id="ch-factors" data-chapter="factors" className="scroll-mt-4 max-w-[680px]">
                <p className="eyebrow text-clay">{num("factors")} · the factors</p>
                <h2 className="mt-1.5 font-serif text-h2 text-ink leading-snug max-w-[36ch]">{headline}</h2>
                <p className="mt-2.5 text-body leading-relaxed text-ink-2 max-w-[62ch]">The signals joined into the matrix the model reads. Each is one column on a shared clock; the chart below ranks how they co-move.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {featureNodes.map((n) => (
                    <button key={n.id} onClick={() => onOpenNode(n.id)} className="group border border-hairline bg-paper px-3 py-2 text-left hover:border-ink transition-colors">
                      <div className="font-mono text-micro uppercase tracking-[0.12em] text-faint">{KIND_TAG[n.kind] ?? n.kind}</div>
                      <div className="text-ui text-ink leading-tight">{labels[n.id] ?? n.name}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 border border-hairline bg-paper p-5">
                  <p className="eyebrow mb-2.5">how the signals move together</p>
                  <Figure spec={corrFig} />
                </div>
              </section>
            );
          })()}

          {/* ── WHAT DROVE IT (the model) ── */}
          {weightsFig && coefs && (
            <section id="ch-model" data-chapter="model" className="scroll-mt-4 max-w-[720px]">
              <p className="eyebrow text-clay">{num("model")} · what drove it{modelLabel ? ` · ${modelLabel}` : ""}</p>
              <h2 className="mt-1.5 font-serif text-h2 text-ink leading-snug max-w-[34ch]">{droveHeadline(coefs, labelForFeature)}</h2>
              {(modelSpec.kind || modelSpec.alpha != null) && (
                <p className="mt-2.5 text-body leading-relaxed text-ink-2 max-w-[62ch]">
                  A <span className="font-mono text-ink">{modelSpec.kind ?? "linear"}</span> fit{modelSpec.alpha != null ? <> at <span className="font-mono text-ink">α={modelSpec.alpha}</span></> : null} over {Object.keys(coefs).length} correlated factors{modelSpec.target ? <> against <span className="font-mono text-ink">{modelSpec.target}</span></> : null}. The weights are the model's read on which signal earns its place.
                </p>
              )}
              <div className="ticks mt-4 border border-hairline bg-paper p-5">
                <Figure spec={weightsFig} />
              </div>
              <p className="mt-2.5 font-mono text-meta text-faint">model weights · positive (blue) adds signal · negative (clay) hedges</p>
            </section>
          )}

          {/* ── WHEN IT WORKS (the regime) ── */}
          {regimeFig && spec?.regimeSeries && (
            <section id="ch-regime" data-chapter="regime" className="scroll-mt-4 max-w-[720px]">
              <p className="eyebrow text-clay">{num("regime")} · when it works</p>
              <h2 className="mt-1.5 font-serif text-h2 text-ink leading-snug max-w-[40ch]">{regimeHeadline(spec.regimeSeries)}</h2>
              <p className="mt-2.5 text-body leading-relaxed text-ink-2 max-w-[62ch]">The strategy is regime-dependent by construction: it earns in mean-reverting stretches and bleeds in trends. Read the ribbon against the equity curve up top — the clay weeks are the drawdown.</p>
              <div className="mt-4 border border-hairline bg-paper p-5">
                <Figure spec={regimeFig} />
              </div>
            </section>
          )}

          {/* ── HOW IT WAS BUILT (compact recipe) ── */}
          <section id="ch-recipe" data-chapter="recipe" className="scroll-mt-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <p className="eyebrow text-clay">{num("recipe")} · how it was built</p>
              {onOpenLens && <button onClick={() => onOpenLens("graph")} className="font-mono text-meta text-muted hover:text-ink transition-colors">full lineage in the Graph lens →</button>}
            </div>
            <h2 className="mt-1.5 font-serif text-h2 text-ink leading-snug">From data to the finding, in {flow.length} steps.</h2>
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="flex items-stretch min-w-min">
                {flow.map((n, i) => {
                  const ds = datasets[n.name];
                  return (
                    <Fragment key={n.id}>
                      <button onClick={() => onOpenNode(n.id)} className={`group shrink-0 w-[150px] text-left border bg-paper px-3 py-2.5 transition-colors ${n.kind === "result" ? "border-clay" : "border-hairline hover:border-ink"}`}>
                        <div className={`font-mono text-micro uppercase tracking-[0.13em] ${n.kind === "result" ? "text-clay" : "text-faint"}`}>{KIND_TAG[n.kind] ?? n.kind}</div>
                        <div className="mt-1 text-ui text-ink leading-tight truncate">{labels[n.id] ?? n.name}</div>
                        <div className="mt-0.5 font-mono text-micro text-faint truncate">{ds ? `${(ds.rows / 1e6).toFixed(1)}M rows` : producerOps[n.id] ?? n.name}</div>
                      </button>
                      {i < flow.length - 1 && <div className="flex items-center px-1.5 text-hairline-2 font-mono shrink-0">→</div>}
                    </Fragment>
                  );
                })}
                {building && (
                  <>
                    {flow.length > 0 && <div className="flex items-center px-1.5 text-hairline-2 font-mono shrink-0">→</div>}
                    <div className="shrink-0 w-[150px] border border-dashed border-clay/60 bg-paper px-3 py-2.5 animate-pulse">
                      <div className="font-mono text-micro uppercase tracking-[0.13em] text-clay">building</div>
                      <div className="mt-1 text-ui text-ink leading-tight truncate">{buildingLabel ?? "…"}</div>
                      {buildingOp && <div className="mt-0.5 font-mono text-micro text-clay truncate">{buildingOp}</div>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
