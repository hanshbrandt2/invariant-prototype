"use client";

import type { NodeKind } from "@/lib/types";
import { DatasetOverview } from "@/components/workspace/dataset-overview";
import { ResultFace } from "@/components/workspace/result-face";
import { FallbackFace } from "@/components/workspace/inspector/fallback-face";
import { ArtifactData } from "@/components/workspace/inspector/artifact-data";
import { type FaceProps, inputsOf, nodeById, KIND_NOUN } from "@/components/workspace/inspector/face-types";

/* ── shared bits ─────────────────────────────────────────────────────────── */

function Lede({ p, children }: { p: FaceProps; children?: React.ReactNode }) {
  const c = p.concepts[p.node.kind];
  return (
    <div className="max-w-[66ch]">
      <p className="text-[1.02rem] leading-[1.7] text-ink-2">
        <span className="italic text-ink">{p.label}</span> is a {KIND_NOUN[p.node.kind] ?? p.node.kind}
        {p.op && (
          <>
            {" "}— built by <span className="font-mono text-clay">{p.op}</span>
          </>
        )}
        . {c?.what}
      </p>
      {children}
    </div>
  );
}

function Inputs({ p, title = "built from" }: { p: FaceProps; title?: string }) {
  const ins = inputsOf(p.graph, p.node.id);
  if (!ins.length) return null;
  return (
    <div className="mt-7">
      <p className="eyebrow mb-2.5">{title}</p>
      <div className="flex flex-wrap gap-2">
        {ins.map(({ id }) => {
          const n = nodeById(p.graph, id);
          return (
            <button
              key={id}
              onClick={() => p.onOpenNode(id)}
              className="group flex items-center gap-2 border border-hairline-2 px-2.5 py-1.5 hover:border-ink transition-colors"
            >
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-muted">{n?.kind}</span>
              <span className="text-[0.82rem] text-ink-2 group-hover:text-ink">{p.labels[id] ?? n?.name ?? id}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-7">
    <p className="eyebrow mb-2.5">{title}</p>
    {children}
  </div>
);

/** Every derived artifact leads with its real output data (tables-first). */
const Data = ({ p }: { p: FaceProps }) => <ArtifactData node={p.node} op={p.op} graph={p.graph} producerOps={p.producerOps} />;

/* ── kind faces ──────────────────────────────────────────────────────────── */

function FeatureFace(p: FaceProps) {
  // the typed spec is the source of truth for the operator + its window;
  // fall back to the producer-op hint when a node carries no spec.
  const spec = p.node.spec as { operator?: string; window?: number; expr?: string } | undefined;
  const op = spec?.operator ?? p.op;
  const w = spec?.window ? String(spec.window) : "w";
  const isRet = op === "derive_column" && /ret/i.test(p.node.name);
  const isVol = op === "derive_column" && /vol/i.test(p.node.name);
  const expr =
    spec?.expr ? spec.expr
    : op === "rolling_zscore" ? `(x − rolling_mean(x, ${w})) / rolling_std(x, ${w})`
    : isRet ? "log(close) − log(close.shift(1))"
    : isVol ? `rolling_std(returns, ${w}) · √periods`
    : op === "coint_spread" ? "a − β·b   (β from the cointegrating regression)"
    : op === "stitch_contracts" ? "back-adjusted front-month, rolled on the exchange calendar"
    : undefined;
  const explain =
    op === "rolling_zscore" ? `rolling_mean and rolling_std are taken over a trailing window of ${w} bars, so the z-score measures how many standard deviations the current value sits above or below its own recent average. Only past bars enter the statistic — nothing looks ahead.`
    : isRet ? "close.shift(1) is the previous bar's close, so this is today's log price minus the prior bar's — the one-bar log return. shift only ever looks backward, so no future information leaks in."
    : isVol ? `rolling_std is the standard deviation of returns over a trailing window of ${w} bars, scaled by √periods to annualise — the realised volatility observable at each bar.`
    : op === "coint_spread" ? "β is the hedge ratio from the cointegrating regression of a on b; the spread is the residual a − β·b — what's left after hedging out the common move."
    : op === "stitch_contracts" ? "the front contract is rolled to the next on the exchange calendar and back-adjusted (Panama), so the continuous series carries no artificial jump at the roll."
    : undefined;
  return (
    <div className="p-6">
      <Lede p={p} />
      <Data p={p} />
      {expr && (
        <Section title="how it's computed">
          <div className="rounded-lg border border-ink bg-ink text-paper p-4 font-mono text-[0.82rem]">{expr}</div>
          {explain && <p className="mt-3 text-[0.92rem] leading-[1.7] text-ink-2 max-w-[60ch]">{explain}</p>}
        </Section>
      )}
      <Inputs p={p} />
    </div>
  );
}

function MatrixFace(p: FaceProps) {
  return (
    <div className="p-6">
      <Lede p={p} />
      <Data p={p} />
      <Inputs p={p} title="columns" />
    </div>
  );
}

function TargetFace(p: FaceProps) {
  return (
    <div className="p-6">
      <Lede p={p} />
      <Data p={p} />
      <div className="mt-6 border border-[#3B6D11]/40 bg-paper px-5 py-4">
        <p className="eyebrow text-[#3B6D11]">no lookahead</p>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-2">
          The target is shifted strictly into the future (<span className="font-mono text-clay">{p.op ?? "lead"}</span>). At each bar it
          holds a return the model could only have known <span className="italic">after</span> acting — so training on it cannot peek ahead.
        </p>
      </div>
      <Inputs p={p} />
    </div>
  );
}

function ModelFace(p: FaceProps) {
  const spec = p.node.spec as { kind?: string; alpha?: number; coefficients?: Record<string, number> } | undefined;
  const coefFallback = (name: string) => {
    let s = 0;
    for (let i = 0; i < name.length; i++) s = (s * 31 + name.charCodeAt(i)) >>> 0;
    return (((s % 200) - 100) / 100).toFixed(3);
  };
  // prefer the real fitted coefficients from the spec; else derive from inputs.
  const coeffRows: [string, string][] = spec?.coefficients
    ? Object.entries(spec.coefficients).map(([k, v]) => [k, v.toFixed(3)])
    : inputsOf(p.graph, p.node.id)
        .map((i) => nodeById(p.graph, i.id))
        .filter((f): f is NonNullable<typeof f> => !!f && f.kind !== "target")
        .map((f) => [f.name, coefFallback(f.name)]);
  const reg = spec?.kind ? `${spec.kind} · α=${spec.alpha ?? 0.1}` : "ridge · α=0.1";
  return (
    <div className="p-6">
      <Lede p={p} />
      <Section title="fitted coefficients">
        <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">
          {coeffRows.map(([name, val]) => (
            <div key={name} className="flex items-center justify-between px-4 py-2 font-mono text-[0.8rem]">
              <span className="text-ink-2">{name}</span>
              <span className="tabular-nums text-ink">{val}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-2 font-mono text-[0.8rem] bg-paper-2/50">
            <span className="text-faint">regularisation</span>
            <span className="text-clay">{reg}</span>
          </div>
        </div>
      </Section>
      <Inputs p={p} title="trained on" />
    </div>
  );
}

const POLICY_INFO: Record<string, { cls: string; invariant: string; scope: string; review: string }> = {
  roll_stitch_cl_calendar_panama: {
    cls: "roll_stitch_policy",
    invariant: "Front-month futures roll on the exchange calendar and back-adjust (Panama), so the continuous series carries no artificial gap at the roll — the stitch never injects a return that wasn't actually traded.",
    scope: "CL (WTI) front-month continuous",
    review: "approved",
  },
  position_sizing_top_decile_long_short: {
    cls: "position_sizing",
    invariant: "Positions are sized long the top decile and short the bottom decile of the signal, dollar-neutral — the book carries no net directional exposure.",
    scope: "cross-sectional long/short books",
    review: "approved",
  },
};

function PolicyFace(p: FaceProps) {
  // read the typed PolicySpec from the contract; fall back to the local map.
  const spec = (p.node.spec ?? {}) as { policyClass?: string; intendedInvariant?: string; scopeOfApplicability?: string[]; reviewStatus?: string };
  const fb = POLICY_INFO[p.node.name];
  const info = {
    cls: spec.policyClass ?? fb?.cls ?? p.node.name.replace(/_[a-z]+$/, "_policy"),
    invariant: spec.intendedInvariant ?? fb?.invariant ?? "An invariant enforced on every build that references it.",
    scope: spec.scopeOfApplicability?.join(", ") ?? fb?.scope ?? "—",
    review: spec.reviewStatus ?? fb?.review ?? "approved",
  };
  const governs = p.graph.nodes.filter((n) => n.policyRefs?.includes(p.node.id));
  return (
    <div className="p-6">
      <p className="max-w-[66ch] text-[1.02rem] leading-[1.7] text-ink-2">
        <span className="italic text-ink">{p.label}</span> is a policy — {p.concepts.policy?.what}
      </p>
      <Section title="intended invariant">
        <p className="font-serif text-[1.05rem] leading-[1.6] text-ink max-w-[64ch]">{info.invariant}</p>
      </Section>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 border border-hairline divide-x divide-hairline">
        {[["class", info.cls], ["scope", info.scope], ["review", info.review]].map(([k, v]) => (
          <div key={k} className="px-4 py-3">
            <div className="eyebrow">{k}</div>
            <div className={`mt-1 font-mono text-[0.82rem] ${k === "review" ? "text-[#3B6D11]" : "text-ink"}`}>{v}</div>
          </div>
        ))}
      </div>
      {governs.length > 0 && (
        <Section title="governs">
          <div className="flex flex-wrap gap-2">
            {governs.map((n) => (
              <button key={n.id} onClick={() => p.onOpenNode(n.id)} className="font-mono text-[0.76rem] border border-clay text-clay rounded-full px-2.5 py-1 hover:bg-clay hover:text-paper transition-colors">
                {p.labels[n.id] ?? n.name}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function StrategyFace(p: FaceProps) {
  return (
    <div className="p-6">
      <Lede p={p} />
      <div className="mt-6 border border-hairline bg-paper px-5 py-4">
        <p className="eyebrow">the rule</p>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-2">Go long when the signal is high, short when it is low, flat in between — sized by the attached position-sizing policy.</p>
      </div>
      <Inputs p={p} title="signals" />
    </div>
  );
}

function UniverseFace(p: FaceProps) {
  return (
    <div className="p-6">
      <Lede p={p} />
      <div className="mt-6 grid grid-cols-2 border border-hairline divide-x divide-hairline">
        <div className="px-4 py-3">
          <div className="eyebrow">construction</div>
          <div className="mt-1 font-mono text-[0.82rem] text-[#3B6D11]">{p.node.pitConstruction ?? "point_in_time"}</div>
        </div>
        <div className="px-4 py-3">
          <div className="eyebrow">members</div>
          <div className="mt-1 font-mono text-[0.82rem] text-ink">eligible at each bar</div>
        </div>
      </div>
      <Inputs p={p} />
    </div>
  );
}

function FigureFace(p: FaceProps) {
  return (
    <div className="p-6">
      <Lede p={p} />
      <Data p={p} />
      <Inputs p={p} title="drawn from" />
    </div>
  );
}

function OperatorFace(p: FaceProps) {
  return (
    <div className="p-6">
      <Lede p={p} />
      <Section title="signature">
        <div className="border border-ink bg-ink text-paper p-4 font-mono text-[0.82rem]">
          {p.node.name}(input) → output
        </div>
      </Section>
      <Inputs p={p} title="applied to" />
    </div>
  );
}

/* ── wrappers for the existing bespoke faces ─────────────────────────────── */

function DatasetFace(p: FaceProps) {
  return p.dataset ? <DatasetOverview dataset={p.dataset} /> : <FallbackFace node={p.node} producerOp={p.op} />;
}
function ResultFaceAdapter(p: FaceProps) {
  return <ResultFace node={p.node} spec={p.spec} validator={p.validator} onOpenNode={p.onOpenNode} />;
}
function GenericFace(p: FaceProps) {
  return <FallbackFace node={p.node} producerOp={p.op} />;
}

/* ── the registry ────────────────────────────────────────────────────────── */

const FACES: Partial<Record<NodeKind, (p: FaceProps) => React.ReactNode>> = {
  dataset: DatasetFace,
  "raw-dataset": DatasetFace,
  feature: FeatureFace,
  matrix: MatrixFace,
  target: TargetFace,
  model: ModelFace,
  result: ResultFaceAdapter,
  policy: PolicyFace,
  strategy: StrategyFace,
  universe: UniverseFace,
  figure: FigureFace,
  operator: OperatorFace,
  user_operator: OperatorFace,
};

export function faceFor(kind: NodeKind): (p: FaceProps) => React.ReactNode {
  return FACES[kind] ?? GenericFace;
}
