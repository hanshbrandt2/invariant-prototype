import type { BuildEstimate, BuildEvent, Turn } from "@/lib/types";
import { planBuild, planCredits, type BuildPlan } from "@/lib/sim/plan";

/**
 * The simulated streaming backend. Treat exactly like a real one:
 * estimateBuild returns the decomposition+cost; runBuild streams steps with
 * realistic delays. Nothing here is real — it's the mock that makes the
 * prototype feel alive.
 */

const CHEAP_CREDITS = 3; // below this, builds just run; above, gate the spend

export async function estimateBuild(
  prompt: string,
  datasetId?: string
): Promise<BuildEstimate & { plan: BuildPlan }> {
  const plan = planBuild(prompt, datasetId);
  const credits = planCredits(plan);
  const steps = plan.steps.length;
  const etaSec = Math.round(credits * 11);
  return {
    plan,
    steps,
    credits,
    etaSec,
    big: credits >= CHEAP_CREDITS && !plan.profileOnly,
    scopeNote: plan.horizonYears > 1 ? `${plan.horizonYears} years` : undefined,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stream the build step-by-step, so the canvas + meter watch it happen. */
export async function* runBuild(
  plan: BuildPlan,
  producedId: string
): AsyncIterable<BuildEvent> {
  const total = plan.steps.length;
  for (let i = 0; i < total; i++) {
    const stepItem = plan.steps[i];
    yield { type: "step_start", step: stepItem, index: i, total };
    await sleep(420 + Math.min(900, stepItem.credits * 280));
    yield { type: "step_done", step: stepItem, index: i, total };
    await sleep(140);
  }
  yield { type: "done", producedId };
}

/** Scripted assistant: a canned reply + the produced node to push. */
export function respond(prompt: string, plan: BuildPlan): { turn: Turn; producedId: string } {
  const producedId = plan.profileOnly
    ? `dataset:${plan.datasetId}`
    : "result:bt_2024_06_meanrev:v1";
  const text = plan.profileOnly
    ? `loading ${plan.datasetLabel} — registering, profiling, and landing the overview on the canvas.`
    : `on it — decomposing into ${plan.steps.length} steps over ${plan.datasetLabel}. watching it build now; i'll land the result on the canvas.`;
  return {
    turn: {
      id: `a-${Date.now()}`,
      role: "assistant",
      text,
      actions: [{ type: "push_node", ref: producedId }],
    },
    producedId,
  };
}
