"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Turn, NextAction, BuildStep } from "@/lib/types";
import { useCredits } from "@/components/app/credits-context";
import { estimateBuild, runBuild, respond } from "@/lib/sim";
import type { BuildPlan } from "@/lib/sim/plan";
import type { WorkspaceBundle, CanvasView } from "@/components/workspace/types";
import { Conversation } from "@/components/workspace/conversation";
import { Canvas } from "@/components/workspace/canvas";
import { EstimateDialog } from "@/components/workspace/estimate-dialog";

export type StepState = { step: BuildStep; status: "pending" | "running" | "done" };

export function WorkspaceClient({ bundle }: { bundle: WorkspaceBundle }) {
  const { debit } = useCredits();
  const [turns, setTurns] = useState<Turn[]>(bundle.initialTurns);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [building, setBuilding] = useState(false);
  const [pending, setPending] = useState<
    | { prompt: string; plan: BuildPlan; steps: number; credits: number; etaSec: number; scopeNote?: string }
    | null
  >(null);

  // initial canvas view
  const firstResult = bundle.lineage.nodes.find((n) => n.kind === "result");
  const [view, setView] = useState<CanvasView>(() => {
    if (bundle.initialView === "lineage") return { kind: "lineage", ref: bundle.workspaceId };
    if (bundle.isNew && (bundle.initialBuildPrompt || bundle.initialDataId)) return { kind: "building" };
    if (bundle.isNew) return { kind: "empty" };
    return firstResult ? { kind: "node", nodeId: firstResult.id } : { kind: "empty" };
  });
  const [stack, setStack] = useState<CanvasView[]>([]);

  const addTurn = useCallback((t: Turn) => setTurns((prev) => [...prev, t]), []);

  const stream = useCallback(
    async (plan: BuildPlan, prompt: string) => {
      const r = respond(prompt, plan);
      addTurn(r.turn);
      setSteps(plan.steps.map((s) => ({ step: s, status: "pending" })));
      setBuilding(true);
      setView({ kind: "building" });
      for await (const ev of runBuild(plan, r.producedId)) {
        if (ev.type === "step_start") {
          setSteps((prev) => prev.map((x, i) => (i === ev.index ? { ...x, status: "running" } : x)));
        } else if (ev.type === "step_done") {
          setSteps((prev) => prev.map((x, i) => (i === ev.index ? { ...x, status: "done" } : x)));
          debit(ev.step.credits);
        } else if (ev.type === "done") {
          setBuilding(false);
          setView({ kind: "node", nodeId: ev.producedId });
          addTurn({
            id: `done-${ev.producedId}`,
            role: "assistant",
            text: "done — it's on the canvas. open the lineage to see exactly how it was built.",
            actions: [{ type: "push_node", ref: ev.producedId }],
          });
        }
      }
    },
    [addTurn, debit]
  );

  const begin = useCallback(
    async (prompt: string, datasetId?: string) => {
      const est = await estimateBuild(prompt, datasetId);
      if (est.big) {
        setPending({ prompt, plan: est.plan, steps: est.steps, credits: est.credits, etaSec: est.etaSec, scopeNote: est.scopeNote });
        addTurn({
          id: `est-${Date.now()}`,
          role: "assistant",
          text: `that's a big one — ~${est.steps} steps${est.scopeNote ? ` over ${est.scopeNote}` : ""} · est. ~${est.credits} credits · ~${Math.max(1, Math.round(est.etaSec / 60))} min. run it?`,
        });
      } else {
        await stream(est.plan, prompt);
      }
    },
    [addTurn, stream]
  );

  const submit = useCallback(
    (prompt: string) => {
      addTurn({ id: `u-${Date.now()}`, role: "user", text: prompt });
      void begin(prompt);
    },
    [addTurn, begin]
  );

  const pickData = useCallback(
    (datasetId: string, label: string) => {
      addTurn({ id: `u-${Date.now()}`, role: "user", text: `Start with ${label}.` });
      void begin(`profile ${label}`, datasetId);
    },
    [addTurn, begin]
  );

  const openNode = useCallback((nodeId: string) => {
    setStack((s) => [...s, view]);
    setView({ kind: "node", nodeId });
  }, [view]);

  const openLineage = useCallback((ref: string) => {
    setStack((s) => [...s, view]);
    setView({ kind: "lineage", ref });
  }, [view]);

  const back = useCallback(() => {
    setStack((s) => {
      if (!s.length) return s;
      setView(s[s.length - 1]);
      return s.slice(0, -1);
    });
  }, []);

  const onAction = useCallback(
    (a: NextAction) => {
      if (a.type === "push_node") openNode(a.ref);
      else if (a.type === "open_catalog") setView({ kind: "empty" });
      else if (a.type === "chip") submit(a.prompt);
    },
    [openNode, submit]
  );

  // fire the queued intent (resume-by-URL) once on mount
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (bundle.isNew && bundle.initialBuildPrompt) {
      addTurn({ id: "u-init", role: "user", text: bundle.initialBuildPrompt });
      void begin(bundle.initialBuildPrompt);
    } else if (bundle.isNew && bundle.initialDataId) {
      const d = bundle.datasets[bundle.initialDataId];
      pickData(bundle.initialDataId, d?.name ?? bundle.initialDataId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <Conversation
        turns={turns}
        building={building}
        onSubmit={submit}
        onAction={onAction}
      />
      <Canvas
        view={view}
        bundle={bundle}
        steps={steps}
        canBack={stack.length > 0}
        onBack={back}
        onOpenNode={openNode}
        onOpenLineage={openLineage}
        onPickData={pickData}
      />
      {pending && (
        <EstimateDialog
          steps={pending.steps}
          credits={pending.credits}
          etaSec={pending.etaSec}
          scopeNote={pending.scopeNote}
          onRun={() => {
            const p = pending;
            setPending(null);
            void stream(p.plan, p.prompt);
          }}
          onCancel={() => {
            setPending(null);
            addTurn({ id: `c-${Date.now()}`, role: "assistant", text: "no problem — scope it down (fewer years, one asset) and the estimate drops before you commit." });
          }}
        />
      )}
    </div>
  );
}
