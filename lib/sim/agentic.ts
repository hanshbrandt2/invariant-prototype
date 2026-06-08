import type { AgenticEvent, BuildStep, LineageEdge, Node, Recipe, ResultSpec } from "@/lib/types";

/**
 * The simulated agentic run. The agent re-runs a promoted recipe on its own —
 * here, on new data (2025-Q1) — building node by node WITHIN the pinned laws.
 * Two scripted outcomes:
 *  · "clean" — the normal case. Every artifact validates; it produces a fresh
 *    point-in-time backtest, logs it, and finishes. This is the happy path.
 *  · "halt" — the trust moment. The eligible universe it constructs is a
 *    present-day snapshot, which violates the pinned `Point-in-time universe`
 *    invariant, so the run HALTS instead of quietly producing a wrong number.
 *
 * Treat exactly like a streaming backend (cf. lib/sim/runBuild).
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function node(kind: Node["kind"], name: string, extra: Partial<Node> = {}): Node {
  return { id: `${kind}:${name}:v1`, source: kind === "dataset" ? "data-catalog" : "artifact-catalog", kind, name, version: "v1", state: "live", ...extra };
}
function step(s: { id: string; label: string; op?: string; credits: number; node: Node; nodeLabel: string; parents: string[]; edgeKind: LineageEdge["kind"]; resultSpec?: ResultSpec }): BuildStep {
  return { id: s.id, label: s.label, op: s.op, credits: s.credits, node: s.node, nodeLabel: s.nodeLabel, resultSpec: s.resultSpec, edges: s.parents.map((p) => ({ childId: s.node.id, parentId: p, kind: s.edgeKind })) };
}

/** The scripted run: the shared clean steps, then EITHER a validated result
 *  (clean) OR the halting step. */
function agenticPlan(): { clean: BuildStep[]; ok: BuildStep; halt: { step: BuildStep; pinId: string; reason: string } } {
  const ds = node("dataset", "crude_oil_1m_2025q1", { pitConstruction: "point_in_time", contentHash: "sha256:4c19…77b2", asOfKnowledgeTime: "2025-03-31T00:00:00Z" });
  const cont = node("feature", "cl_front_2025", { lineageHash: "sha256:21b8…6d04", producerCodeHash: "git:4a9f2c1", policyRefs: ["policy:roll_stitch_cl_calendar_panama:1"], spec: { operator: "stitch_contracts", roll: "calendar", adjust: "panama" } });
  const z = node("feature", "cl_z20_2025", { lineageHash: "sha256:3c7e…91ab", producerCodeHash: "git:b2044af", spec: { operator: "rolling_zscore", window: 20 } });
  const mdl = node("model", "cl_ridge_2025", { lineageHash: "sha256:e2b9…1c6a", producerCodeHash: "git:9d3e0a4", spec: { kind: "ridge", alpha: 0.1, param_estimation: "walk_forward" } });

  const clean: BuildStep[] = [
    { id: "a-load", label: "load crude_oil_1m · 2025-Q1, as-of pinned", op: "load", credits: 0.5, node: ds, nodeLabel: "WTI · 2025-Q1", edges: [] },
    step({ id: "a-stitch", label: "stitch front-month (calendar-Panama)", op: "stitch_contracts", credits: 0.8, node: cont, nodeLabel: "Front-month · 2025", parents: [ds.id], edgeKind: "stitch_source" }),
    step({ id: "a-z", label: "20-bar z-score", op: "rolling_zscore", credits: 1.0, node: z, nodeLabel: "Z-score · 20", parents: [cont.id], edgeKind: "input_dependency" }),
    step({ id: "a-fit", label: "fit ridge (walk-forward)", op: "fit_model", credits: 1.4, node: mdl, nodeLabel: "Ridge · walk-fwd", parents: [z.id], edgeKind: "training_data" }),
  ];

  // happy path: the 2025 backtest, evaluated on a point-in-time universe — it
  // validates against every pin, so the run finishes with a real finding.
  const okRes = node("result", "bt_2025q1_meanrev", {
    pitConstruction: "point_in_time",
    lineageHash: "sha256:7a3d…2f10",
    contentHash: "sha256:7a3d…2f10",
    producerCodeHash: "git:c55d172",
    policyRefs: ["policy:position_sizing_top_decile_long_short:1"],
    asOfKnowledgeTime: "2025-03-31T00:00:00Z",
    spec: { operator: "evaluate_strategy", universe: "point_in_time" },
  });
  const okSpec: ResultSpec = {
    friendlyName: "Backtest · 2025-Q1",
    intendedInvariant: "The mean-reversion edge persists out-of-sample on 2025-Q1, evaluated point-in-time within every pinned law.",
    evalWindow: { start: "2025-01-02", end: "2025-03-31" },
    metrics: { sharpe: 1.38, hit_rate: 0.557, ann_return: 0.179, max_drawdown: -0.084 },
    lineageRefs: ["model:cl_ridge_2025:v1", "feature:cl_z20_2025:v1"],
    nextProposal: { kind: "none", reason: "Edge holds out-of-sample; no change indicated this cycle." },
  };
  const okStep = step({ id: "a-eval-ok", label: "evaluate on the point-in-time universe", op: "evaluate_strategy", credits: 1.4, node: okRes, nodeLabel: "Backtest · 2025-Q1", parents: [mdl.id], edgeKind: "input_model", resultSpec: okSpec });

  // the halting artifact: the same backtest, but on a universe the agent built
  // as a present-day snapshot (NOT reconstructed point-in-time).
  const haltRes = node("result", "bt_2025q1_meanrev_snap", { pitConstruction: "current_snapshot", policyRefs: ["policy:position_sizing_top_decile_long_short:1"], spec: { operator: "evaluate_strategy", universe: "current_snapshot" } });
  const haltStep = step({ id: "a-eval", label: "evaluate on the 2025 universe", op: "evaluate_strategy", credits: 1.4, node: haltRes, nodeLabel: "Backtest · 2025-Q1", parents: [mdl.id], edgeKind: "input_model" });
  return {
    clean,
    ok: okStep,
    halt: { step: haltStep, pinId: "pit_universe", reason: "the eligible universe was constructed as a present-day snapshot, not reconstructed point-in-time — so it embeds names that weren't eligible in the backtest window." },
  };
}

export async function* runAgentic(recipe: Recipe, scenario: "clean" | "halt" = "halt"): AsyncIterable<AgenticEvent> {
  yield { type: "thinking", text: `Re-running ${recipe.name} on new data (2025-Q1), within the ${recipe.pins.length} pinned laws.` };
  await sleep(700);
  const { clean, ok, halt } = agenticPlan();
  const total = clean.length + 1;
  for (let i = 0; i < clean.length; i++) {
    yield { type: "step_start", step: clean[i], index: i, total };
    await sleep(560 + Math.min(700, clean[i].credits * 280));
    yield { type: "step_done", step: clean[i], index: i, total };
    await sleep(160);
  }
  if (scenario === "clean") {
    yield { type: "step_start", step: ok, index: clean.length, total };
    await sleep(820);
    yield { type: "step_done", step: ok, index: clean.length, total };
    await sleep(160);
    yield { type: "done", producedId: ok.node!.id };
  } else {
    yield { type: "step_start", step: halt.step, index: clean.length, total };
    await sleep(700);
    yield { type: "halt", step: halt.step, pinId: halt.pinId, reason: halt.reason };
  }
}
