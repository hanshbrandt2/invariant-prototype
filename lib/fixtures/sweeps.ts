import type { LineageEdge, Node, Sweep, SweepResult } from "@/lib/types";
import { deriveValidator } from "@/lib/validator";
import { fig1Lineage } from "@/lib/fixtures/fig1-lineage";
import { resultSpecs } from "@/lib/fixtures/result-specs";
import { genMetrics } from "@/lib/fixtures/variants";

/**
 * The worked-example sweep: the z-score lookback window varied over 10 / 20 /
 * 40 / 60, each producing its OWN result sibling — same recipe, same pinned
 * contract, one knob different — so the comparison is honestly like-for-like.
 * The canvas stacks these four downward in the result lane; collapsing the lane
 * opens the existing Compare leaderboard.
 *
 * Each sibling is a real, content-addressed result node (own lineage_hash); the
 * 20-bar sibling IS the canonical result already on the spine.
 */

const BASE_ID = "result:bt_2024_06_meanrev:v1";
const MODEL_ID = "model:linreg_baseline:v1";
const WINDOWS = ["10", "20", "40", "60"] as const;

// deterministic, distinct mock hashes per sibling (not real digests)
const HASHES: Record<string, string> = {
  "10": "sha256:4b1e…77a0",
  "20": "sha256:21b8…6d04", // the canonical result's hash
  "40": "sha256:c93d…0f12",
  "60": "sha256:6a7f…be51",
};

function sibling(value: string): SweepResult {
  const isBase = value === "20";
  const id = isBase ? BASE_ID : `result:bt_2024_06_meanrev_w${value}:v1`;
  const node: Node =
    isBase && fig1Lineage.nodes.find((n) => n.id === BASE_ID)
      ? fig1Lineage.nodes.find((n) => n.id === BASE_ID)!
      : {
          id,
          source: "artifact-catalog",
          kind: "result",
          name: `bt_2024_06_meanrev_w${value}`,
          version: "v1",
          state: "saved",
          policyRefs: ["policy:position_sizing_top_decile_long_short:1"],
          lineageHash: HASHES[value],
          contentHash: HASHES[value],
          producerCodeHash: "git:c55d172",
          owner: "h.brandt",
          createdAt: "2024-06-28T18:05:00Z",
          asOfKnowledgeTime: "2024-06-28T00:00:00Z",
          description: `Mean-reversion backtest with the z-score window swept to ${value} bars.`,
          spec: { operator: "evaluate_strategy", sweepParam: "window", sweepValue: value, policy: "position_sizing_top_decile_long_short" },
        };
  const edges: LineageEdge[] = [{ childId: id, parentId: MODEL_ID, kind: "input_model" }];
  // the canonical 20-bar sibling shows the authored result metrics; the rest are
  // deterministic downstream numbers, peaked near ~22 bars so 20 wins honestly.
  const metrics = isBase ? resultSpecs[BASE_ID]?.metrics ?? genMetrics("window", value) : genMetrics("window", value);
  const validator = deriveValidator(node, fig1Lineage);
  return { node, edges, value, metrics, validator };
}

export const sweepsByWorkspace: Record<string, Sweep> = {
  "crude-oil-research": {
    baseId: BASE_ID,
    param: "window",
    op: "rolling_zscore",
    results: WINDOWS.map(sibling),
  },
};
