import type { BuildEstimate, BuildEvent } from "@/lib/types";
import { planBuild, planCredits, type BuildPlan } from "@/lib/sim/plan";

/**
 * The simulated streaming backend. Treat exactly like a real one:
 * estimateBuild returns the (accretive) decomposition + cost; runBuild streams
 * steps with realistic delays, emitting each produced node so the canvas grows
 * node-by-node. Nothing here is real — it's the mock that makes it feel alive.
 */

// A "big" build gates the spend (estimate → approve). Cheap builds — a single
// dataset profile or a single-year strategy — just run and tick. Genuinely
// expensive ones (multi-year, or many credits) wait for a click.
const BIG_CREDITS = 12;

export async function estimateBuild(
  prompt: string,
  datasetId?: string,
  existingNodeIds: string[] = [],
  horizonOverride?: number
): Promise<BuildEstimate & { plan: BuildPlan }> {
  const plan = planBuild(prompt, datasetId, existingNodeIds, horizonOverride);
  const credits = planCredits(plan);
  const steps = plan.steps.length;
  const etaSec = Math.round(credits * 11);
  return {
    plan,
    steps,
    credits,
    etaSec,
    big: !plan.profileOnly && (credits >= BIG_CREDITS || plan.horizonYears > 1),
    scopeNote: plan.horizonYears > 1 ? `${plan.horizonYears} years` : undefined,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stream the build step-by-step; step_done carries the node to materialise. */
export async function* runBuild(plan: BuildPlan): AsyncIterable<BuildEvent> {
  const total = plan.steps.length;
  for (let i = 0; i < total; i++) {
    const step = plan.steps[i];
    yield { type: "step_start", step, index: i, total };
    await sleep(420 + Math.min(900, step.credits * 280));
    yield { type: "step_done", step, index: i, total };
    await sleep(160);
  }
  yield { type: "done", producedId: plan.producedId };
}

/** The assistant's plain-language narration of a plan (chat blurb). */
export function narrate(plan: BuildPlan): string {
  if (plan.alreadyBuilt) {
    return `that's already in this workspace — here it is on the canvas.`;
  }
  if (plan.profileOnly) {
    return `loading ${plan.datasetLabel} — registering, profiling, and landing the overview on the canvas.`;
  }
  const n = plan.steps.length;
  return `here's the plan — ${n} step${n === 1 ? "" : "s"} over ${plan.datasetLabel}. i'll build it onto the canvas; watch it grow.`;
}

/** The simulated agentic run — re-runs a promoted recipe within its pins. */
export { runAgentic } from "@/lib/sim/agentic";
