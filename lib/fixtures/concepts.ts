import type { Concept, NodeKind } from "@/lib/types";

/**
 * What each kind *is*, in context — drives the Concepts lens, and doubles as
 * the education funnel. Generic per-kind text; the lens specialises it with
 * the focused artifact's label and the operator that produced it.
 *
 * HONESTY BAR: these describe the real artifact kinds and their place in the
 * graph (dataset → feature → matrix → target → model → result, governed by
 * policy). No invented capabilities; no internal storage vocabulary.
 */
export const conceptByKind: Record<string, Concept> = {
  dataset: {
    what: "A dataset is the raw, point-in-time record you start from — prices and volume on a fixed schedule, exactly as they were known at each timestamp.",
    why: "Everything downstream traces back to here. Because it's point-in-time, nothing you build on it can quietly peek at the future.",
  },
  "raw-dataset": {
    what: "A raw dataset is the unmodified source feed — the bars as delivered, before any operator has touched them.",
    why: "It's the anchor of the lineage: the one node with no parents, so provenance always terminates somewhere reproducible.",
  },
  feature: {
    what: "A feature is a computed signal derived from data — one number per timestamp that summarises something you care about.",
    why: "Features turn raw prices into the inputs a model can learn from, each one a named, reusable, hashed step in the graph.",
  },
  matrix: {
    what: "A matrix lines several features up on a shared timeline and universe, so every column is observed at the same instant.",
    why: "Models train on a matrix, not loose features — the alignment is what keeps timestamps honest across signals.",
  },
  target: {
    what: "A target is what you're trying to predict — typically a forward return, shifted strictly into the future.",
    why: "Keeping the target in the future is the whole game: it's how the backtest avoids learning from information it couldn't have had.",
  },
  model: {
    what: "A model is a fitted relationship from the feature matrix to the target — here, a small linear estimator with its coefficients pinned.",
    why: "It's saved as an artifact with its own hash, so the exact fit that produced a result can always be reproduced.",
  },
  result: {
    what: "A result is the finding — a backtest's metrics over an explicit evaluation window, plus the next move it suggests.",
    why: "It carries its full lineage and the policies it obeyed, so every number on it is traceable to code you can run yourself.",
  },
  policy: {
    what: "A policy is an invariant written once and enforced on every build — a roll convention, a sizing rule, a calendar.",
    why: "Policies are the assumptions that silently break backtests; attaching them to the graph makes them explicit and auditable.",
  },
  universe: {
    what: "A universe is the set of instruments in scope at each point in time, constructed point-in-time so it never includes names that weren't yet eligible.",
    why: "Survivorship bias hides here; a point-in-time universe is how the analysis stays honest about what was actually tradable.",
  },
  strategy: {
    what: "A strategy is the rule that turns signals into positions — when to be long, short, or flat, and how much.",
    why: "It sits between the model and the result, and it's where sizing and risk policies bind.",
  },
  figure: {
    what: "A figure is a saved presentation of a result — a chart or table assembled from artifacts already in the graph.",
    why: "Figures are reproducible too: they cite the artifacts they were drawn from, not a screenshot.",
  },
  operator: {
    what: "An operator is one verb in the algebra — a single, typed transform like rolling_zscore or fit_model.",
    why: "Every node in the graph is the output of exactly one operator, which is why the whole analysis reads as runnable code.",
  },
  user_operator: {
    what: "A user operator is a custom transform you've defined, slotted into the same typed algebra as the built-ins.",
    why: "It extends the vocabulary without breaking the contract — it's hashed and traced like any other step.",
  },
};

export function getConcept(kind: NodeKind): Concept | undefined {
  return conceptByKind[kind];
}
