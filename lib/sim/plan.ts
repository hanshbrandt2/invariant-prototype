import type { BuildStep } from "@/lib/types";
import {
  buildRecipe,
  datasetMeta,
  detectDataset,
  detectHorizon,
  detectIntent,
  volumeFactor,
  type Intent,
} from "@/lib/sim/recipes";

/**
 * The planner decomposes a request into a task list by routing to a curated,
 * operator-honest recipe (intent x dataset). That decomposition IS the cost
 * estimate. It is ACCRETIVE: steps whose node already exists in the workspace
 * graph are dropped, so continuing the conversation grows the same graph
 * rather than rebuilding it.
 */

export interface BuildPlan {
  datasetId: string;
  datasetLabel: string;
  intent: Intent;
  horizonYears: number;
  scopeOptions: number[]; // horizons the user can scope down to (empty if 1y)
  profileOnly: boolean;
  steps: BuildStep[]; // only the steps NOT already built
  producedId: string; // the terminal node this build lands on
  alreadyBuilt: boolean; // nothing new to build (everything already exists)
}

/** Horizons the gate can offer for scope-down — the standard ladder rungs at or
 *  below the requested horizon. Returns [] when there's nothing to trim (1y). */
function scopeLadder(h: number): number[] {
  const ladder = [1, 3, 5, 10].filter((v) => v <= h);
  if (h > 1 && !ladder.includes(h)) ladder.push(h);
  return ladder.length > 1 ? ladder : [];
}

export function planBuild(
  prompt: string,
  datasetId?: string,
  existingNodeIds: string[] = [],
  horizonOverride?: number
): BuildPlan {
  const ds = datasetId ?? detectDataset(prompt);
  const intent = detectIntent(prompt, ds);
  const horizonYears = horizonOverride ?? detectHorizon(prompt);
  const m = datasetMeta(ds);

  const full = buildRecipe(intent, ds, horizonYears);
  const producedId = full[full.length - 1]?.node?.id ?? `dataset:${ds}:v1`;

  // scale every step by the dataset's data-volume factor so the per-step credits
  // and the total stay consistent (bigger data → more compute throughout).
  const vol = volumeFactor(ds);
  const scaled = vol === 1 ? full : full.map((s) => ({ ...s, credits: +(s.credits * vol).toFixed(1) }));

  const have = new Set(existingNodeIds);
  const steps = scaled.filter((s) => !(s.node && have.has(s.node.id)));

  return {
    datasetId: ds,
    datasetLabel: m.label,
    intent,
    horizonYears,
    scopeOptions: scopeLadder(horizonYears),
    profileOnly: intent === "profile",
    steps,
    producedId,
    alreadyBuilt: steps.length === 0,
  };
}

export function planCredits(plan: BuildPlan): number {
  return +plan.steps.reduce((a, s) => a + s.credits, 0).toFixed(1);
}
