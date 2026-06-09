"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  Turn,
  NextAction,
  BuildStep,
  LineageEdge,
  LineageSubgraph,
  ResultSpec,
  StepStatus,
  PlanView,
  VariantGroup,
  Pin,
  AgenticConfig,
} from "@/lib/types";
import { useCredits } from "@/components/app/credits-context";
import { useAuth } from "@/components/auth/auth-context";
import { estimateBuild, runBuild, narrate, runAgentic } from "@/lib/sim";
import { knobForOp, inferCurrent, genMetrics, buildPipeline, deriveValidator, validatorOk } from "@/lib/data";
import { buildProject } from "@/lib/code-project";
import type { BuildPlan } from "@/lib/sim/plan";
import type { WorkspaceBundle, CanvasState, InspectTarget, Lens } from "@/components/workspace/types";
import { Conversation } from "@/components/workspace/conversation";
import { Canvas } from "@/components/workspace/canvas";
import { CodeView } from "@/components/workspace/code-view";
import { ContractRail } from "@/components/workspace/contract-rail";
import { PromotePanel } from "@/components/workspace/promote-panel";
import { ForkDialog } from "@/components/workspace/fork-dialog";
import { WorkspaceRail } from "@/components/workspace/workspace-rail";
import { WorkspaceTopBar } from "@/components/workspace/workspace-topbar";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** All artifacts reachable downstream of `id` over lineage edges (exclusive). */
function descendantsOf(g: LineageSubgraph, id: string): Set<string> {
  const out = new Set<string>();
  const down = (n: string) => g.edges.forEach((e) => { if (e.parentId === n && !out.has(e.childId)) { out.add(e.childId); down(e.childId); } });
  down(id);
  return out;
}

/** Longest-path depth per node — used to rebuild a stale subgraph in dependency order. */
function depthMap(g: LineageSubgraph): Record<string, number> {
  const parents: Record<string, string[]> = {};
  for (const n of g.nodes) parents[n.id] = [];
  for (const e of g.edges) if (parents[e.childId]) parents[e.childId].push(e.parentId);
  const d: Record<string, number> = {};
  const visit = (id: string, seen: Set<string>): number => {
    if (d[id] != null) return d[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents[id] ?? [];
    d[id] = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
    return d[id];
  };
  for (const n of g.nodes) visit(n.id, new Set());
  return d;
}

export function WorkspaceClient({ bundle }: { bundle: WorkspaceBundle }) {
  const { debit } = useCredits();
  const { requireAuth } = useAuth();
  const [turns, setTurns] = useState<Turn[]>(bundle.initialTurns);

  // the LIVE workspace graph — grows node-by-node as builds stream.
  const [graph, setGraph] = useState<LineageSubgraph>(bundle.lineage);
  const [labels, setLabels] = useState<Record<string, string>>(() => ({ ...bundle.labels }));
  const [producerOps, setProducerOps] = useState<Record<string, string>>(() => ({ ...bundle.producerOps }));
  const [resultSpecs, setResultSpecs] = useState<Record<string, ResultSpec>>(() => ({ ...bundle.resultSpecs }));
  const [variants, setVariants] = useState<Record<string, VariantGroup>>(() => ({ ...bundle.variants }));
  const [drawer, setDrawer] = useState<InspectTarget | null>(bundle.initialDrawer ?? null);
  const [forkNode, setForkNode] = useState<string | null>(bundle.initialFork ?? null);
  const [chatOpen, setChatOpen] = useState(true);

  // the contract rail's pins — structural ones are locked; invariants/policies
  // can be toggled in/out of force, which the consequences strip reacts to.
  const [pins, setPins] = useState<Pin[]>(bundle.invariants);
  const [flashedPin, setFlashedPin] = useState<string | null>(null);
  const [openPin, setOpenPin] = useState<string | null>(null); // the expanded contract-rail pin
  // the active lens — one analysis told four ways. The Graph is the hero, so it
  // is the default; a deep-linked ?lens= or legacy ?view=code overrides it.
  const [lens, setLens] = useState<Lens>(bundle.initialLens ?? (bundle.initialCodeView ? "code" : "graph"));
  const [promoting, setPromoting] = useState(bundle.initialPromote ?? false);
  const togglePin = useCallback((id: string) => {
    setPins((ps) => ps.map((p) => (p.id === id && (p.kind === "invariant" || p.kind === "policy") ? { ...p, state: p.state === "active" ? "off" : "active" } : p)));
  }, []);

  const [building, setBuilding] = useState(false);
  const [inFlightId, setInFlightId] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ turnId: string; plan: BuildPlan; prompt: string; datasetId?: string } | null>(null);

  // reactive lineage: when an upstream artifact changes, every downstream artifact
  // is STALE (no longer reflects its inputs) until rebuilt. `pendingMetric` is the
  // new figure held back until the rebuild commits it — you don't get it for free.
  const [stale, setStale] = useState<Set<string>>(new Set());
  const [changed, setChanged] = useState<{ id: string; label: string } | null>(null);
  const [pendingMetric, setPendingMetric] = useState<Record<string, number> | null>(null);

  // The synthesis canvas is one surface: empty (start-with-data) → live (the
  // stage-laned graph with the inline result hero). Node detail = the drawer.
  const [canvas, setCanvas] = useState<CanvasState>(() => {
    if (bundle.isNew && !(bundle.initialBuildPrompt || bundle.initialDataId)) return { phase: "empty" };
    return { phase: "live" };
  });

  // refs to read current values inside async streams without stale closures
  const graphRef = useRef(graph);
  useEffect(() => { graphRef.current = graph; }, [graph]);
  const idRef = useRef(0);
  const uid = (p: string) => `${p}-${++idRef.current}`;

  const addTurn = useCallback((t: Turn) => setTurns((prev) => [...prev, t]), []);

  const updatePlanStep = useCallback((turnId: string, stepId: string, status: StepStatus) => {
    setTurns((prev) =>
      prev.map((t) =>
        t.id === turnId && t.plan
          ? { ...t, plan: { ...t.plan, steps: t.plan.steps.map((s) => (s.id === stepId ? { ...s, status } : s)) } }
          : t
      )
    );
  }, []);

  const materialize = useCallback((step: BuildStep) => {
    const nd = step.node;
    if (!nd) return;
    setGraph((g) => (g.nodes.some((n) => n.id === nd.id) ? g : { nodes: [...g.nodes, nd], edges: [...g.edges, ...(step.edges ?? [])] }));
    if (step.nodeLabel) setLabels((l) => ({ ...l, [nd.id]: step.nodeLabel! }));
    if (step.op) setProducerOps((o) => ({ ...o, [nd.id]: step.op! }));
    if (step.resultSpec) setResultSpecs((r) => ({ ...r, [nd.id]: step.resultSpec! }));
  }, []);

  const stream = useCallback(
    async (plan: BuildPlan, turnId: string) => {
      setBuilding(true);
      setCanvas({ phase: "live" }); // the build accretes onto the one canvas surface
      for await (const ev of runBuild(plan)) {
        if (ev.type === "step_start") {
          // the node materialises immediately and pulses while in flight, then
          // settles when the step completes — "watch it build", node by node.
          materialize(ev.step);
          setInFlightId(ev.step.node?.id ?? null);
          updatePlanStep(turnId, ev.step.id, "running");
        } else if (ev.type === "step_done") {
          materialize(ev.step);
          setInFlightId(null);
          debit(ev.step.credits);
          updatePlanStep(turnId, ev.step.id, "done");
        } else if (ev.type === "done") {
          setBuilding(false);
          setInFlightId(null);
          // a pure profile opens the dataset overview in the inspector; a build
          // leaves the finding on the canvas as the inline result hero.
          if (plan.profileOnly) setDrawer({ type: "node", id: ev.producedId });
          addTurn({
            id: uid("done"),
            role: "assistant",
            text: plan.profileOnly
              ? "loaded — the overview's open. tell me what to build next."
              : "done — the finding's on the canvas. click any node to see exactly how it was built.",
            actions: [{ type: "push_node", ref: ev.producedId }],
          });
        }
      }
    },
    [addTurn, debit, materialize, updatePlanStep]
  );

  const begin = useCallback(
    async (prompt: string, datasetId?: string) => {
      const existing = graphRef.current.nodes.map((n) => n.id);
      const est = await estimateBuild(prompt, datasetId, existing);
      if (est.plan.alreadyBuilt) {
        addTurn({ id: uid("a"), role: "assistant", text: narrate(est.plan), actions: [{ type: "push_node", ref: est.plan.producedId }] });
        return;
      }
      const turnId = uid("plan");
      const plan: PlanView = {
        steps: est.plan.steps.map((s) => ({ id: s.id, label: s.label, op: s.op, credits: s.credits, status: "pending" as StepStatus })),
        credits: est.credits,
        awaitingApproval: est.big,
        horizonYears: est.plan.horizonYears,
        scopeOptions: est.big ? est.plan.scopeOptions : undefined,
      };
      addTurn({ id: turnId, role: "assistant", text: narrate(est.plan), plan });
      // profiling a hosted dataset is browsing — it runs free. An actual build
      // creates owned, billable artifacts, so it's gated: login-at-build.
      if (est.plan.profileOnly) {
        await stream(est.plan, turnId);
        return;
      }
      const proceed = () => {
        if (est.big) setPendingPlan({ turnId, plan: est.plan, prompt, datasetId });
        else void stream(est.plan, turnId);
      };
      requireAuth(proceed);
    },
    [addTurn, stream, requireAuth]
  );

  // scope-down: re-estimate the pending build at a smaller horizon and replace
  // the gated plan in place, so the credit total visibly falls before approval.
  const onScopePlan = useCallback(
    async (turnId: string, years: number) => {
      if (!pendingPlan || pendingPlan.turnId !== turnId) return;
      const existing = graphRef.current.nodes.map((n) => n.id);
      const est = await estimateBuild(pendingPlan.prompt, pendingPlan.datasetId, existing, years);
      const view: PlanView = {
        steps: est.plan.steps.map((s) => ({ id: s.id, label: s.label, op: s.op, credits: s.credits, status: "pending" as StepStatus })),
        credits: est.credits,
        awaitingApproval: true,
        horizonYears: est.plan.horizonYears,
        scopeOptions: est.plan.scopeOptions,
      };
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, text: narrate(est.plan), plan: view } : t)));
      setPendingPlan({ turnId, plan: est.plan, prompt: pendingPlan.prompt, datasetId: pendingPlan.datasetId });
    },
    [pendingPlan]
  );

  const submit = useCallback(
    (prompt: string) => {
      addTurn({ id: uid("u"), role: "user", text: prompt });
      void begin(prompt);
    },
    [addTurn, begin]
  );

  const pickData = useCallback(
    (datasetId: string, label: string) => {
      addTurn({ id: uid("u"), role: "user", text: `Start with ${label}.` });
      void begin(`profile ${label}`, datasetId);
    },
    [addTurn, begin]
  );

  const onApprovePlan = useCallback(
    (turnId: string) => {
      if (!pendingPlan || pendingPlan.turnId !== turnId) return;
      setTurns((prev) => prev.map((t) => (t.id === turnId && t.plan ? { ...t, plan: { ...t.plan, awaitingApproval: false } } : t)));
      const plan = pendingPlan.plan;
      setPendingPlan(null);
      void stream(plan, turnId);
    },
    [pendingPlan, stream]
  );

  // ── agentic run: the agent re-runs a promoted recipe on its own, WITHIN the
  // pinned laws — and HALTS the moment an artifact would violate one. ─────────
  const runAgenticPreview = useCallback(
    async (cfg: AgenticConfig, scenario: "clean" | "halt" = "clean") => {
      void cfg;
      setPromoting(false);
      const recipe = bundle.recipe;
      if (!recipe) return;
      setBuilding(true);
      setCanvas({ phase: "live" });
      addTurn({ id: uid("ag"), role: "system", text: `⚙ Agentic run · ${recipe.name} — re-running on new data (2025-Q1), within ${recipe.pins.length} pinned laws.` });
      for await (const ev of runAgentic(recipe, scenario)) {
        if (ev.type === "thinking") {
          addTurn({ id: uid("ag"), role: "assistant", text: ev.text });
        } else if (ev.type === "step_start") {
          materialize(ev.step);
          setInFlightId(ev.step.node?.id ?? null);
        } else if (ev.type === "step_done") {
          materialize(ev.step);
          setInFlightId(null);
          debit(ev.step.credits);
          addTurn({ id: uid("ag"), role: "assistant", text: `✓ ${ev.step.label}`, actions: ev.step.node ? [{ type: "push_node", ref: ev.step.node.id }] : undefined });
        } else if (ev.type === "done") {
          // happy path: every artifact validated → a fresh point-in-time result.
          setBuilding(false);
          setInFlightId(null);
          setDrawer({ type: "node", id: ev.producedId });
          setOpenPin(null);
          addTurn({
            id: uid("ag"),
            role: "system",
            text: `✓ Run complete — Backtest · 2025-Q1 validated against all ${recipe.pins.length} pinned laws. Logged to runs — the finding's open on the canvas.`,
            actions: [{ type: "push_node", ref: ev.producedId }],
          });
          return;
        } else if (ev.type === "halt") {
          materialize(ev.step);
          setInFlightId(null);
          setBuilding(false);
          const pinLabel = pins.find((p) => p.id === ev.pinId)?.label ?? ev.pinId;
          addTurn({
            id: uid("ag"),
            role: "system",
            text: `⛔ HALTED at “${ev.step.label}” — violates pinned invariant ‘${pinLabel}’. ${ev.reason} The run stopped instead of shipping a wrong number.`,
            actions: ev.step.node ? [{ type: "push_node", ref: ev.step.node.id }] : undefined,
          });
          setFlashedPin(ev.pinId);
          return;
        }
      }
    },
    [bundle.recipe, addTurn, materialize, debit, pins]
  );

  // ── the slide-over inspector: opening any node (from chat or the graph) slides
  // it in from the right while the graph stays put behind it. ──────────────────
  // opening a node/edge/compare closes any expanded contract-rail pin (and vice
  // versa) — the two detail surfaces are mutually exclusive, never cramped.
  const openNode = useCallback((nodeId: string) => { setDrawer({ type: "node", id: nodeId }); setOpenPin(null); }, []);
  const inspectNode = useCallback((id: string) => { setDrawer({ type: "node", id }); setOpenPin(null); }, []);
  const inspectEdge = useCallback((e: LineageEdge) => { setDrawer({ type: "edge", parentId: e.parentId, childId: e.childId }); setOpenPin(null); }, []);
  const compare = useCallback((nodeId: string) => { setDrawer({ type: "compare", nodeId }); setOpenPin(null); }, []);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const onOpenPin = useCallback((id: string | null) => { setOpenPin(id); if (id) setDrawer(null); }, []);

  // the validator for a node referenced in chat (the badge's chat zoom).
  const validatorFor = useCallback(
    (id: string) => {
      const n = graph.nodes.find((x) => x.id === id);
      return n && n.kind !== "dataset" && n.kind !== "raw-dataset" ? deriveValidator(n, graph) : undefined;
    },
    [graph]
  );

  // ── forking: vary a node's typed knob to spawn + run new sibling variants ──
  const openFork = useCallback((nodeId: string) => setForkNode(nodeId), []);
  const runFork = useCallback(
    (nodeId: string, values: string[]) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const existing = variants[nodeId];
      const knob = existing ? { param: existing.param, options: existing.knob } : knobForOp(producerOps[nodeId]);
      if (!knob) return;
      const cur = existing?.chosen ?? inferCurrent(node.name, knob.param);
      const built = new Set([...(existing?.members.map((m) => m.value) ?? []), cur]);
      const fresh = values.filter((v) => !built.has(v));
      setForkNode(null);
      if (!fresh.length) {
        setDrawer({ type: "compare", nodeId });
        return;
      }
      debit(+(fresh.length * 0.8).toFixed(1));
      setVariants((prev) => {
        const base =
          prev[nodeId] ?? { param: knob.param, knob: knob.options, chosen: cur, members: [{ value: cur, metrics: genMetrics(knob.param, cur) }], bestBy: "sharpe" };
        const members = [...base.members, ...fresh.map((v) => ({ value: v, metrics: genMetrics(knob.param, v) }))];
        return { ...prev, [nodeId]: { ...base, members, bestBy: "sharpe" } };
      });
      setDrawer({ type: "compare", nodeId });
    },
    [graph, variants, producerOps, debit]
  );

  // ── reactive lineage ───────────────────────────────────────────────────────
  // mark everything downstream of a changed artifact as stale + announce it.
  const reviseFrom = useCallback(
    (id: string, note?: string) => {
      const g = graphRef.current;
      const node = g.nodes.find((n) => n.id === id);
      const desc = descendantsOf(g, id);
      if (!desc.size) return;
      const label = labels[id] ?? node?.name ?? id;
      setStale(desc);
      setChanged({ id, label });
      setCanvas({ phase: "live" });
      addTurn({
        id: uid("stale"),
        role: "system",
        text: `⚠ ${label} changed${note ? ` (${note})` : ""} — ${desc.size} downstream ${desc.size === 1 ? "artifact is" : "artifacts are"} now stale (no longer reflect their inputs). Rebuild to restore reproducibility.`,
      });
    },
    [labels, addTurn]
  );

  // rebuild ONLY the stale sub-lineage, in dependency order, then commit the held-
  // back figure and clear staleness — the finding reflects its inputs again.
  const rebuildStale = useCallback(async () => {
    const ids = [...stale];
    if (!ids.length || building) return;
    const d = depthMap(graphRef.current);
    const order = ids.slice().sort((a, b) => (d[a] ?? 0) - (d[b] ?? 0));
    setBuilding(true);
    setCanvas({ phase: "live" });
    addTurn({ id: uid("rb"), role: "system", text: `⟲ Rebuilding ${ids.length} affected ${ids.length === 1 ? "artifact" : "artifacts"} — only the changed sub-lineage re-runs.` });
    for (const id of order) {
      setInFlightId(id);
      await sleep(460);
      debit(0.6);
    }
    setInFlightId(null);
    if (pendingMetric) {
      const result = graphRef.current.nodes.find((n) => n.kind === "result");
      if (result) setResultSpecs((rs) => (rs[result.id] ? { ...rs, [result.id]: { ...rs[result.id], metrics: { ...rs[result.id].metrics, ...pendingMetric } } } : rs));
    }
    setPendingMetric(null);
    setStale(new Set());
    setChanged(null);
    setBuilding(false);
    const result = graphRef.current.nodes.find((n) => n.kind === "result");
    addTurn({
      id: uid("rb"),
      role: "system",
      text: `✓ Rebuilt ${ids.length} ${ids.length === 1 ? "artifact" : "artifacts"} — lineage re-pinned, the finding reflects its inputs again.`,
      actions: result ? [{ type: "push_node", ref: result.id }] : undefined,
    });
  }, [stale, building, pendingMetric, debit, addTurn]);

  // promote a variant onto the spine: changing the parameter doesn't silently
  // re-number the finding — it makes the downstream stale; you rebuild to get
  // (and own) the new figure.
  const promote = useCallback(
    (nodeId: string, value: string) => {
      const g = variants[nodeId];
      if (!g) return;
      setVariants((prev) => ({ ...prev, [nodeId]: { ...prev[nodeId], chosen: value } }));
      setPendingMetric(g.members.find((x) => x.value === value)?.metrics ?? null);
      setDrawer(null); // close the compare drawer so the stale graph is visible
      reviseFrom(nodeId, `${g.param} → ${value}`);
    },
    [variants, reviseFrom]
  );

  // export getters — computed lazily on click so they always reflect the latest
  // graph + conversation. The script is the terminal node's full reproducible code.
  const getScript = useCallback(
    () => buildPipeline(graph, producerOps, bundle.workspaceName),
    [graph, producerOps, bundle.workspaceName]
  );

  // the whole runnable repo, for the .zip export (clone → pip install → run)
  const getProject = useCallback(
    () => buildProject(graph, producerOps, bundle.workspaceName).map((f) => ({ path: f.path, content: f.code })),
    [graph, producerOps, bundle.workspaceName]
  );

  const getConversation = useCallback(() => {
    const head = `# ${bundle.workspaceName} — conversation\n`;
    const body = turns
      .map((t) => {
        const who = t.role === "user" ? "## You" : t.role === "assistant" ? "## Invariant" : "## System";
        const plan = t.plan ? `\n\n${t.plan.steps.map((s) => `- [${s.status === "done" ? "x" : " "}] ${s.label} (${s.credits} cr)`).join("\n")}` : "";
        return `${who}\n\n${t.text}${plan}`;
      })
      .join("\n\n");
    return `${head}\n${body}\n`;
  }, [turns, bundle.workspaceName]);

  const onAction = useCallback(
    (a: NextAction) => {
      if (a.type === "push_node") openNode(a.ref);
      else if (a.type === "open_catalog") setCanvas({ phase: "empty" });
      else if (a.type === "chip") submit(a.prompt);
    },
    [openNode, submit]
  );

  // fire the queued intent (resume-by-URL) once on mount
  const fired = useRef(false);
  /* eslint-disable react-hooks/set-state-in-effect -- fire the queued intent (resume-by-URL) exactly once on mount */
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (bundle.isNew && bundle.initialBuildPrompt) {
      addTurn({ id: "u-init", role: "user", text: bundle.initialBuildPrompt });
      void begin(bundle.initialBuildPrompt);
    } else if (bundle.isNew && bundle.initialDataId) {
      const d = bundle.datasets[bundle.initialDataId];
      pickData(bundle.initialDataId, d?.name ?? bundle.initialDataId);
    } else if (bundle.initialAgentic) {
      void runAgenticPreview({ scope: ["new_data"], trigger: "on_demand", budget: 25, enabledAt: "" }, bundle.initialAgentic);
    }
    if (bundle.initialRevise) reviseFrom(bundle.initialRevise); // deep-link: open on a stale state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const live = canvas.phase === "live";
  const selectedNodeId = drawer?.type === "node" ? drawer.id : drawer?.type === "compare" ? drawer.nodeId : undefined;
  // the integrity seal's verdict — the terminal result's harness verdict, honest.
  // A stale graph can't be reproducible-by-construction, so the seal drops too.
  const resultNode = graph.nodes.find((n) => n.kind === "result");
  const sealOk = stale.size > 0 ? false : resultNode ? validatorOk(deriveValidator(resultNode, graph)) : true;

  return (
    <div className="flex h-screen bg-paper">
      <WorkspaceRail />
      {chatOpen && (
        <Conversation turns={turns} building={building} onSubmit={submit} onAction={onAction} onApprovePlan={onApprovePlan} onScopePlan={onScopePlan} onCollapse={() => setChatOpen(false)} validatorFor={validatorFor} onFlashPin={setFlashedPin} />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <WorkspaceTopBar
          workspaceName={bundle.workspaceName}
          live={live}
          chatOpen={chatOpen}
          onToggleChat={() => setChatOpen((o) => !o)}
          getScript={getScript}
          getConversation={getConversation}
          getProject={getProject}
          canPromote={!!bundle.recipe && live}
          onPromote={() => setPromoting(true)}
          lens={lens}
          onLens={setLens}
        />
        <ContractRail
          pins={pins}
          consequences={bundle.consequences}
          vintages={bundle.vintages}
          sealOk={sealOk}
          onToggle={togglePin}
          openId={openPin}
          onOpen={onOpenPin}
          flashedPin={flashedPin}
          onFlashHandled={() => setFlashedPin(null)}
        />
        {stale.size > 0 && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-2 border-b border-clay/40 bg-clay-wash">
            <span className="text-[0.82rem] text-clay-deep">
              ⚠ {changed && <><span className="italic">{changed.label}</span> changed — </>}
              {stale.size} downstream {stale.size === 1 ? "artifact is" : "artifacts are"} stale · the finding no longer reflects its inputs (not reproducible until rebuilt)
            </span>
            <button
              onClick={() => void rebuildStale()}
              disabled={building}
              className="shrink-0 font-mono text-[0.66rem] uppercase tracking-[0.1em] border border-clay text-clay px-3 py-1 hover:bg-clay hover:text-paper transition-colors disabled:opacity-50"
            >
              {building ? "rebuilding…" : `rebuild ${stale.size} →`}
            </button>
          </div>
        )}
        {lens === "code" ? (
          <CodeView graph={graph} producerOps={producerOps} selectedNodeId={selectedNodeId} workspaceName={bundle.workspaceName} onSelectNode={inspectNode} />
        ) : (
          <Canvas
            canvas={canvas}
            lens={lens}
            staleIds={stale}
            workspaceName={bundle.workspaceName}
            onFlashPin={setFlashedPin}
            onOpenCode={() => setLens("code")}
            graph={graph}
            labels={labels}
            producerOps={producerOps}
            resultSpecs={resultSpecs}
            datasets={bundle.datasets}
            concepts={bundle.concepts}
            variants={variants}
            building={building}
            inFlightId={inFlightId}
            selectedNodeId={selectedNodeId}
            onPickData={pickData}
            drawer={drawer}
            drawerTab={bundle.initialDrawerTab}
            onInspectNode={inspectNode}
            onInspectEdge={inspectEdge}
            onCompare={compare}
            onCloseDrawer={closeDrawer}
            onPromote={promote}
            onFork={openFork}
          />
        )}
      </div>
      {promoting && bundle.recipe && (
        <PromotePanel
          recipe={bundle.recipe}
          pins={pins.filter((p) => bundle.recipe!.pins.includes(p.id))}
          runs={bundle.runs ?? []}
          onSaveRecipe={(n) => addTurn({ id: uid("rec"), role: "system", text: `✓ saved “${n}” to your recipes — reproducible by construction. promote it to agentic to run it on its own.` })}
          onEnableAgentic={(cfg, scenario) => void runAgenticPreview(cfg, scenario)}
          onClose={() => setPromoting(false)}
        />
      )}
      {forkNode &&
        (() => {
          const node = graph.nodes.find((n) => n.id === forkNode);
          const existing = variants[forkNode];
          const knob = existing ? { param: existing.param, options: existing.knob } : knobForOp(producerOps[forkNode]);
          if (!node || !knob) return null;
          const cur = existing?.chosen ?? inferCurrent(node.name, knob.param);
          const built = [...(existing?.members.map((m) => m.value) ?? []), cur];
          return (
            <ForkDialog
              nodeLabel={labels[node.id] ?? node.name}
              param={knob.param}
              options={knob.options}
              built={built}
              current={cur}
              onRun={(values) => runFork(forkNode, values)}
              onClose={() => setForkNode(null)}
            />
          );
        })()}
    </div>
  );
}
