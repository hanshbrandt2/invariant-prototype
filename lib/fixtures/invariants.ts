import type { Consequence, Pin, Vintage } from "@/lib/types";

/**
 * The contract layer — the laws every build on a canvas must satisfy. Each pin
 * maps to a REAL backend mechanism (the ADR + the operator/expression in
 * `mechanism`); nothing here is decorative. Two are structural axioms (locked
 * on), four are active invariants, two are policies, one is designed-not-built
 * and can never be put in force (shown honestly, ADR-0039).
 *
 * HONESTY BAR: `cantProve` on every pin states the limit plainly — a green gate
 * is "we failed to falsify", not "proven correct".
 */
export const PINS: Pin[] = [
  {
    id: "no_lookahead",
    label: "No look-ahead",
    state: "structural",
    kind: "structural",
    adr: "ADR-0033",
    locked: true,
    gates: ["P1", "P2", "P3"],
    holds:
      "Every decision on this canvas reads only information that existed at the moment it was made. The future never leaks backward into a feature, a fit, or a trade.",
    enforce:
      "Three adaptedness gates run over the transitive forward-reach closure of the recipe: P1 (inputs are adapted), P2 (the target is shifted strictly forward), P3 (a falsification scan finds no forward-reach edge).",
    scope: "Every artifact in the graph — features, targets, models, results.",
    mechanism: "P1 ∧ P2 ∧ P3  over  forward_reach_closure(recipe)",
    cantProve:
      "P3 is a falsification test, not a proof — a green gate means we failed to falsify on these fixtures. It cannot catch timestamp-correctness bugs in the source data, nor cross-sectional leaks that hide inside a single bar.",
  },
  {
    id: "reproducible",
    label: "Reproducible",
    state: "structural",
    kind: "structural",
    adr: "ADR-0043",
    locked: true,
    gates: ["hash"],
    holds:
      "Every artifact is content-addressed. Re-running the same recipe on the same inputs, with the same code, reproduces the same hash — bit for bit.",
    enforce:
      "A lineage_hash is computed over the recipe, the producer code hash, the as-of knowledge time, and the sorted hashes of every input. Any drift changes the hash.",
    scope: "Every live and deployed artifact.",
    mechanism: "lineage_hash = H(recipe ‖ producer_code_hash ‖ as_of ‖ sorted(input_hashes))",
    cantProve:
      "The hash proves the artifact is pinned and re-runnable. It does not prove the recipe is correct — only that it is exactly this recipe, every time.",
  },
  {
    id: "as_of",
    label: "As-of knowledge time",
    state: "active",
    kind: "invariant",
    adr: "ADR-0023",
    gates: ["P1"],
    holds:
      "Revision-bearing reads are resolved as they were known at the pinned as-of date. A value revised after that date never enters the build.",
    enforce:
      "vintage_collapse(as_of) folds each revision-bearing series to the latest print on or before the as-of, and fences out anything dated later as vintage leakage.",
    scope: "Any input whose values are revised over time (fundamentals, adjusted prices, estimates).",
    mechanism: "vintage_collapse(as_of = 2024-06-28)",
    cantProve:
      "Vintage collapse fences out later revisions. It cannot recover a revision that the vendor never recorded, nor prove the original print was itself correct.",
  },
  {
    id: "pit_universe",
    label: "Point-in-time universe",
    state: "active",
    kind: "invariant",
    adr: "ADR-0028",
    gates: ["P1"],
    holds:
      "Membership in any universe is reconstructed as it stood at each point in time — survivorship and look-ahead in the constituent set are excluded.",
    enforce:
      "eligible_at(t) rebuilds the universe from recorded add/drop events; the validator rejects a present-day snapshot used as if it were historical.",
    scope: "Cross-sectional builds over a universe (baskets, ranks, long/short books).",
    mechanism: "members = eligible_at(t)   ·   reject(current_snapshot)",
    cantProve:
      "eligible_at(t) reconstructs membership from recorded events. It cannot fix a universe whose constituent history was never captured point-in-time.",
  },
  {
    id: "no_full_sample_fit",
    label: "No full-sample fit",
    state: "active",
    kind: "invariant",
    adr: "ADR-0033/0034",
    gates: ["P2"],
    holds:
      "A model never sees the whole sample at fit time. Parameters are estimated without reading the future they are evaluated on.",
    enforce:
      "param_estimation is constrained to {none, a_priori, online, walk_forward}; a full_sample fit raises an error outside an explicitly-flagged research scope.",
    scope: "Every model fit and parameter estimation.",
    mechanism: "param_estimation ∈ {none, a_priori, online, walk_forward}",
    cantProve:
      "Walk-forward estimation removes look-ahead from the fit. It cannot prevent overfitting to the walk-forward path itself, nor multiple-testing across many sweeps.",
  },
  {
    id: "dollar_neutral",
    label: "Dollar-neutral sizing",
    state: "active",
    kind: "policy",
    adr: "ADR-0022/0027",
    gates: ["policy"],
    policyRef: "policy:position_sizing_top_decile_long_short:1",
    intendedInvariant:
      "Positions are long the top decile and short the bottom decile of the signal, dollar-neutral, so the book carries no net directional exposure.",
    holds:
      "The book is held dollar-neutral: long the top decile, short the bottom, with matched dollar exposure on each side.",
    enforce: "The position-sizing policy is attached to the result row and enforced at evaluation.",
    scope: "Cross-sectional long/short books.",
    mechanism: "policy:position_sizing_top_decile_long_short:v1",
    cantProve:
      "Dollar-neutral sizing removes net directional exposure by construction. It does not neutralise factor or sector exposure — the book can still be long a factor.",
  },
  {
    id: "roll_stitch",
    label: "Roll & stitch (CL)",
    state: "off",
    kind: "policy",
    adr: "ADR-0019",
    gates: ["policy"],
    policyRef: "policy:roll_stitch_cl_calendar_panama:1",
    intendedInvariant:
      "Front-month futures roll on the exchange calendar and back-adjust (Panama), so the continuous series carries no artificial gap at the roll.",
    holds:
      "CL is stitched into a continuous front-month series on the exchange calendar, back-adjusted (Panama) so the roll leaves no artificial gap.",
    enforce: "The roll/stitch policy is attached to the continuous feature and enforced by stitch_contracts.",
    scope: "CL front-month continuous series.",
    mechanism: "policy:roll_stitch_cl_calendar_panama:v1",
    cantProve:
      "Calendar-Panama stitching removes the roll gap. It cannot recover true tick liquidity at the roll, nor prove the back-adjustment matches every downstream convention.",
  },
  {
    id: "contribution_tracing",
    label: "Contribution tracing",
    state: "designed",
    kind: "designed",
    adr: "ADR-0039",
    gates: [],
    holds:
      "Designed, not built. When shipped, every result's P&L will be attributed to its upstream features, so you can see which signal earned the return.",
    enforce: "Not yet implemented — the platform cannot decompose contribution today.",
    scope: "Results, once the attribution engine exists.",
    mechanism: "— designed (ADR-0039) —",
    cantProve:
      "Nothing yet — this capability does not exist. It is shown so the roadmap is honest, and it can never be put 'in force' until it is built.",
  },
];

/**
 * The consequences strip — a live readout of what the pinned laws DO to a build.
 * `dependsOnPin` ties a line to a togglable pin (it shows only when that pin is
 * on); lines with no `dependsOnPin` are always in force (the structural axioms).
 */
export const CONSEQUENCES: Consequence[] = [
  { kind: "blocked", text: "lead() / net forward-reach > 0 on a feature → the build fails" },
  { kind: "required", text: "every artifact carries lineage_hash = H(recipe ‖ code ‖ as_of ‖ inputs)" },
  { kind: "required", text: "revision-bearing reads pass through vintage_collapse(as_of)", dependsOnPin: "as_of" },
  { kind: "blocked", text: "a present-day-snapshot universe → rejected", dependsOnPin: "pit_universe" },
  { kind: "blocked", text: "a full-sample GARCH fit → rejected outside research", dependsOnPin: "no_full_sample_fit" },
  { kind: "required", text: "model fits must be walk_forward, recorded in the FittedModelSpec", dependsOnPin: "no_full_sample_fit" },
  { kind: "required", text: "the book is held dollar-neutral · long top decile / short bottom", dependsOnPin: "dollar_neutral" },
  { kind: "required", text: "CL is stitched calendar-Panama at the roll", dependsOnPin: "roll_stitch" },
];

/**
 * The vintage series for the As-of pin's slider — a revision-bearing figure
 * (the backtest Sharpe as it would have been known at each knowledge date).
 * The pinned as-of is 2024-06-28: dates after it are fenced out (would be
 * vintage leakage). `moved` marks a vintage that differs from the first print.
 */
export const PINNED_AS_OF = "2024-06-28";
export const VINTAGES: Vintage[] = [
  { asOf: "2024-03-31", value: 1.31, note: "first print, as known at quarter-end", moved: false, fencedOut: false },
  { asOf: "2024-05-31", value: 1.37, note: "input revised up after the May data correction", moved: true, fencedOut: false },
  { asOf: "2024-06-28", value: 1.42, note: "pinned as-of — the figure on the canvas", moved: true, fencedOut: false },
  { asOf: "2024-09-30", value: 1.39, note: "later knowledge — fenced out as vintage leakage", moved: true, fencedOut: true },
  { asOf: "2024-12-31", value: 1.45, note: "later knowledge — fenced out as vintage leakage", moved: true, fencedOut: true },
];
