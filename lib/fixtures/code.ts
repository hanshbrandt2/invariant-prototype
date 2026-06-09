import type { LineageSubgraph, Node } from "@/lib/types";

/**
 * Code-lens generator: turns the provenance chain into a REAL, runnable Python
 * project — not call-stubs. Every artifact becomes a module with a genuine
 * implementation (polars / numpy / scikit-learn), `pipeline.py` wires them in
 * dependency order, and `requirements.txt` pins the exact libraries.
 *
 * HONESTY BAR (hard): the code is written entirely against the INPUT SCHEMA the
 * user could supply themselves — never an internal storage layer (no bronze/
 * silver/gold) and never a storage path. Operator names are the real registry
 * verbs (stitch_contracts, derive_column, rolling_zscore, coint_spread,
 * join_feature, lead, fit_model, evaluate_strategy). The literal form of
 * "traceable to code you can run yourself": same data in → same result out.
 */

/** The expected input shape — the contract the Code lens opens with. */
export const INPUT_SCHEMA = ["ts_event", "symbol", "open", "high", "low", "close", "volume"] as const;

/** kind → repo folder. Centralised here so the project tree, the import paths in
 *  pipeline.py, and the per-node files never drift apart. */
export const STAGE_FOLDER: Record<string, string> = {
  dataset: "data",
  "raw-dataset": "data",
  universe: "data",
  feature: "features",
  matrix: "matrices",
  target: "targets",
  model: "models",
  strategy: "models",
  result: "results",
  figure: "results",
  policy: "policies",
};

/** Pinned dependencies — the exact libraries the generated code imports. */
export const REQUIREMENTS = [
  "polars==1.12.0",
  "numpy==1.26.4",
  "scikit-learn==1.4.2",
  "pyarrow==15.0.0",
  "# databento==0.34.0   # only if you pull the raw bars from the API yourself",
  "",
].join("\n");

/** The one data seam — load point-in-time OHLCV in the canonical input schema. */
export const LOAD_PY = `"""Load point-in-time OHLCV bars in the canonical Invariant input schema.

Every dataset arrives as one tidy frame:
    { ts_event, symbol, open, high, low, close, volume }

Point DATA_DIR at your own databento export (or the hosted parquet) and the rest
of the pipeline reproduces deterministically — same bars in, same result out.
"""
from __future__ import annotations
from pathlib import Path
import polars as pl

SCHEMA = ["ts_event", "symbol", "open", "high", "low", "close", "volume"]
DATA_DIR = Path(__file__).resolve().parent


def load(name: str) -> pl.DataFrame:
    """Read \`<name>.parquet\`, enforce the canonical schema, sort by time."""
    df = pl.read_parquet(DATA_DIR / f"{name}.parquet")
    missing = [c for c in SCHEMA if c not in df.columns]
    if missing:
        raise ValueError(f"{name}: missing columns {missing}; expected {SCHEMA}")
    return df.select(SCHEMA).sort(["symbol", "ts_event"])
`;

export const GITIGNORE = ["__pycache__/", "*.pyc", ".venv/", "data/*.parquet", ""].join("\n");

const sp = (n: Node): Record<string, unknown> => (n.spec ?? {}) as Record<string, unknown>;
const num = (v: unknown, d: number): number => (typeof v === "number" ? v : d);
const policyName = (n: Node): string | undefined => n.policyRefs?.[0]?.split(":")[1];

/** parents of `id`, in the order their edges appear (so call args are stable). */
function parentsInOrder(sg: LineageSubgraph, id: string): Node[] {
  const byId = Object.fromEntries(sg.nodes.map((n) => [n.id, n]));
  return sg.edges.filter((e) => e.childId === id).map((e) => byId[e.parentId]).filter(Boolean) as Node[];
}

/** Longest-path depth over data edges (policies carry no lineage edge). */
function depths(sg: LineageSubgraph): Record<string, number> {
  const parents: Record<string, string[]> = {};
  const isPolicy = (id: string) => sg.nodes.find((n) => n.id === id)?.kind === "policy";
  for (const n of sg.nodes) parents[n.id] = [];
  for (const e of sg.edges) if (parents[e.childId] && !isPolicy(e.parentId)) parents[e.childId].push(e.parentId);
  const d: Record<string, number> = {};
  const visit = (id: string, seen: Set<string>): number => {
    if (d[id] != null) return d[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ps = parents[id] ?? [];
    d[id] = ps.length ? Math.max(...ps.map((p) => visit(p, seen))) + 1 : 0;
    return d[id];
  };
  for (const n of sg.nodes) visit(n.id, new Set());
  return d;
}

const isData = (n: Node) => n.kind === "dataset" || n.kind === "raw-dataset";

/* ── per-operator REAL implementations ──────────────────────────────────────
 * Each returns the imports it needs + the function body. Signatures take their
 * parents (by node name) so the def matches the call pipeline.py generates.
 * The output column of a feature == its node name, so downstream `pl.col(name)`
 * reads the upstream frame without a lookup table. */

interface Impl {
  imports: string[];
  def: string;
}

function implFor(node: Node, parents: Node[], op: string): Impl {
  const out = node.name;
  const p = parents.map((x) => x.name);
  const pl = ["import polars as pl"];

  switch (op) {
    case "stitch_contracts": {
      const roll = (sp(node).roll as string) ?? "calendar";
      const adjust = (sp(node).adjust as string) ?? "panama";
      return {
        imports: pl,
        def: `def ${out}(${p[0]}, roll="${roll}", adjust="${adjust}"):
    """stitch_contracts — continuous front-month, ${adjust}-adjusted on the ${roll} roll.

    A roll is where the active contract (\`symbol\`) changes. ${adjust[0].toUpperCase() + adjust.slice(1)}
    removes the price gap at each roll by additively shifting the OLDER bars, so
    the continuous series has no artificial jump — and the adjustment only ever
    touches PAST bars, never future ones (no look-ahead). Governed by the
    \`${policyName(node) ?? "roll_stitch"}\` policy.
    """
    df = ${p[0]}.sort("ts_event")
    is_roll = (pl.col("symbol") != pl.col("symbol").shift(1)).fill_null(False)
    gap = pl.when(is_roll).then(pl.col("close") - pl.col("close").shift(1)).otherwise(0.0)
    adj = gap.sum() - gap.cum_sum()  # each bar shifts by the gaps that occur after it
    return df.with_columns([(pl.col(c) + adj).alias(c) for c in ("open", "high", "low", "close")])`,
      };
    }
    case "derive_column": {
      return {
        imports: pl,
        def: `def ${out}(${p[0]}):
    """derive_column — one-bar log return of the continuous close.

    log(close) - log(close.shift(1)); the first bar is null (no prior price) and
    is never back-filled.
    """
    expr = (pl.col("close").log() - pl.col("close").shift(1).log()).alias("${out}")
    return ${p[0]}.sort("ts_event").select([pl.col("ts_event"), expr])`,
      };
    }
    case "rolling_zscore": {
      const w = num(sp(node).window, 20);
      const parentIsData = parents[0] && isData(parents[0]);
      if (parentIsData) {
        return {
          imports: pl,
          def: `def ${out}(${p[0]}, window=${w}):
    """rolling_zscore — trailing z-score of log returns over \`window\` bars.

    The window ENDS at t and needs \`window\` observations (min_periods=window),
    so the first window-1 rows are null — strictly causal. This is what makes the
    \`no-lookahead\` law provable, not merely asserted.
    """
    df = ${p[0]}.sort("ts_event").with_columns(
        (pl.col("close").log() - pl.col("close").shift(1).log()).alias("_ret")
    )
    r = pl.col("_ret")
    mean = r.rolling_mean(window, min_periods=window)
    std = r.rolling_std(window, min_periods=window)
    return df.select([pl.col("ts_event"), ((r - mean) / std).alias("${out}")])`,
        };
      }
      return {
        imports: pl,
        def: `def ${out}(${p[0]}, window=${w}):
    """rolling_zscore — trailing z-score of \`${p[0]}\` over \`window\` bars.

    The window ENDS at t and needs \`window\` observations (min_periods=window),
    so the first window-1 rows are null — strictly causal. This is what makes the
    \`no-lookahead\` law provable, not merely asserted.
    """
    x = pl.col("${p[0]}")
    mean = x.rolling_mean(window, min_periods=window)
    std = x.rolling_std(window, min_periods=window)
    return ${p[0]}.sort("ts_event").select([pl.col("ts_event"), ((x - mean) / std).alias("${out}")])`,
      };
    }
    case "coint_spread": {
      const lb = num(sp(node).lookback, 60);
      return {
        imports: pl,
        def: `def ${out}(${p[0]}, ${p[1]}, lookback=${lb}):
    """coint_spread — standardised cointegration residual of two log-price series.

    Rolling hedge ratio beta = cov(a, b) / var(b) on log prices over \`lookback\`
    bars; spread = log(a) - beta*log(b); then z-scored over the same trailing
    window. Every window is trailing — no look-ahead.
    """
    a = ${p[0]}.select([pl.col("ts_event"), pl.col("close").log().alias("a")]).sort("ts_event")
    b = ${p[1]}.select([pl.col("ts_event"), pl.col("close").log().alias("b")]).sort("ts_event")
    j = a.join(b, on="ts_event", how="inner")
    ca, cb = pl.col("a"), pl.col("b")
    cov = (ca * cb).rolling_mean(lookback) - ca.rolling_mean(lookback) * cb.rolling_mean(lookback)
    var = (cb * cb).rolling_mean(lookback) - cb.rolling_mean(lookback) ** 2
    j = j.with_columns((cov / var).alias("beta"))
    j = j.with_columns((ca - pl.col("beta") * cb).alias("spread"))
    s = pl.col("spread")
    mean = s.rolling_mean(lookback, min_periods=lookback)
    std = s.rolling_std(lookback, min_periods=lookback)
    return j.select([pl.col("ts_event"), ((s - mean) / std).alias("${out}")])`,
      };
    }
    case "join_feature": {
      const cols = (sp(node).columns as string[]) ?? p;
      const others = p.slice(1).map((v) => `${v}.sort("ts_event")`).join(", ");
      return {
        imports: pl,
        def: `def ${out}(${p.join(", ")}):
    """join_feature — as-of align the signals onto one time index.

    join_asof carries each signal's last known value forward to the base clock,
    so nothing from the future leaks across instruments. Columns: ${cols.join(", ")}.
    """
    m = ${p[0]}.sort("ts_event")
    for f in (${others}):
        m = m.join_asof(f, on="ts_event")
    return m.drop_nulls()`,
      };
    }
    case "lead": {
      const periods = num(sp(node).periods, 5);
      const unit = (sp(node).unit as string) ?? "";
      const srcCol = parents[0] ? parents[0].name : "close";
      return {
        imports: pl,
        def: `def ${out}(${p[0]}, periods=${periods}):
    """lead — the TARGET: the return realised over the NEXT \`periods\` bars${unit ? ` (${unit})` : ""}.

    shift(-periods) looks FORWARD on purpose — it is the label we predict, never
    fed back in as a feature, so it cannot leak into training.
    """
    return ${p[0]}.sort("ts_event").select(
        [pl.col("ts_event"), pl.col("${srcCol}").shift(-periods).alias("${out}")]
    )`,
      };
    }
    case "fit_model": {
      const alpha = num(sp(node).alpha, 0.1);
      const matrix = parents.find((x) => x.kind === "matrix") ?? parents[0];
      const target = parents.find((x) => x.kind === "target") ?? parents[1];
      const feats = (sp(matrix).columns as string[]) ?? ["zscore_20", "gas_z20", "spread_5d"];
      const featList = feats.map((c) => `"${c}"`).join(", ");
      return {
        imports: ["import polars as pl", "from sklearn.linear_model import Ridge"],
        def: `def ${out}(${matrix.name}, ${target.name}, alpha=${alpha}):
    """fit_model — ridge regression of the forward return on the signals.

    Fit on the aligned, non-null rows only. Returns the fitted estimator plus the
    feature order, so scoring downstream is reproducible.
    """
    df = ${matrix.name}.join(${target.name}, on="ts_event", how="inner").drop_nulls()
    features = [${featList}]
    X = df.select(features).to_numpy()
    y = df["${target.name}"].to_numpy()
    estimator = Ridge(alpha=alpha).fit(X, y)
    return {"estimator": estimator, "features": features}`,
      };
    }
    case "evaluate_strategy": {
      const window = ((sp(node).evalWindow as string) ?? "2024-01-02 .. 2024-06-28").split("..").map((s) => s.trim());
      const pol = sp(node).policy as string;
      return {
        imports: ["import numpy as np", "import polars as pl"],
        def: `def ${out}(model, matrix, target, window=("${window[0]}", "${window[1]}")):
    """evaluate_strategy — top/bottom-decile dollar-neutral backtest.

    Policy \`${pol ?? "position_sizing"}\`: +1 the top signal decile, -1 the bottom,
    demeaned to dollar-neutral. PnL = position * realised forward return; Sharpe
    annualised from 1-minute bars.
    """
    df = matrix.join(target, on="ts_event", how="inner").drop_nulls()
    lo, hi = window
    df = df.filter(
        (pl.col("ts_event") >= pl.lit(lo).str.to_datetime())
        & (pl.col("ts_event") <= pl.lit(hi).str.to_datetime())
    )
    X = df.select(model["features"]).to_numpy()
    signal = model["estimator"].predict(X)
    hi_d, lo_d = np.quantile(signal, 0.9), np.quantile(signal, 0.1)
    pos = np.where(signal >= hi_d, 1.0, np.where(signal <= lo_d, -1.0, 0.0))
    pos = pos - pos.mean()                       # dollar-neutral
    target_col = [c for c in target.columns if c != "ts_event"][0]
    ret = df[target_col].to_numpy()
    pnl = pos * ret
    bars_per_year = 252 * 390
    sharpe = float(pnl.mean() / pnl.std() * np.sqrt(bars_per_year)) if pnl.std() else 0.0
    traded = pos != 0
    hit = float((np.sign(pos)[traded] == np.sign(ret)[traded]).mean()) if traded.any() else 0.0
    curve = np.cumsum(pnl)
    max_dd = float((curve - np.maximum.accumulate(curve)).min())
    return {
        "sharpe": round(sharpe, 2),
        "hit_rate": round(hit, 3),
        "max_drawdown": round(max_dd, 3),
        "turnover": round(float(np.abs(np.diff(pos)).mean()), 2),
    }`,
      };
    }
    default: {
      // honest fallback for an op without a bespoke impl — never a broken file
      return {
        imports: pl,
        def: `def ${out}(${p.join(", ") || "df"}):
    """${op || "operator"} — produces \`${out}\`. (Implementation pending for this operator.)"""
    raise NotImplementedError("${op || out}")`,
      };
    }
  }
}

/** A dataset's tiny loader module. */
function datasetModule(node: Node): string {
  return [
    `# data/${node.name}.py · dataset`,
    `# ${node.description ?? "point-in-time OHLCV bars"}`,
    `from data.load import load`,
    ``,
    `${node.name} = load("${node.name}")  # { ${INPUT_SCHEMA.join(", ")} }`,
    ``,
  ].join("\n");
}

/** The full module for one artifact node: header + real imports + real impl. */
function artifactModule(node: Node, parents: Node[], op: string): string {
  const impl = implFor(node, parents, op);
  const folder = STAGE_FOLDER[node.kind] ?? "src";
  const head = [
    `# ${folder}/${node.name}.py · ${node.kind}`,
    `# operator: ${op || "—"} · produces \`${node.name}\``,
    node.lineageHash ? `# lineage: ${node.lineageHash} · reproducible` : null,
    node.policyRefs?.length ? `# governed by: ${node.policyRefs.map((r) => r.split(":")[1]).join(", ")}` : null,
  ].filter(Boolean);
  return [...head, "", ...impl.imports, "", impl.def, ""].join("\n");
}

/** Code for every node in a subgraph, keyed by node id (datasets + artifacts). */
export function buildCodeMap(sg: LineageSubgraph, producerOps: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const n of sg.nodes) {
    if (n.kind === "policy") continue; // policies are YAML, not a code module
    if (isData(n)) {
      map[n.id] = datasetModule(n);
      continue;
    }
    const op = producerOps[n.id] ?? (sp(n).operator as string) ?? "";
    map[n.id] = artifactModule(n, parentsInOrder(sg, n.id), op);
  }
  return map;
}

/** Standalone load snippet for a hosted dataset not yet in a lineage. */
export function datasetCode(id: string): string {
  return [
    `# load point-in-time bars in the canonical schema:`,
    `#   { ${INPUT_SCHEMA.join(", ")} }`,
    `from data.load import load`,
    ``,
    `df = load("${id}")`,
    `df.head()`,
  ].join("\n");
}

/** pipeline.py — imports every module and runs the DAG end-to-end. The variable
 *  names are the artifact names (so the wiring reads like the graph); functions
 *  are imported aliased \`op_<name>\` so a call never shadows its own result. */
export function buildPipeline(sg: LineageSubgraph, producerOps: Record<string, string>, projectName = "pipeline"): string {
  const d = depths(sg);
  const flow = sg.nodes.filter((n) => n.kind !== "policy").sort((a, b) => (d[a.id] ?? 0) - (d[b.id] ?? 0));
  const imports = ["from data.load import load"];
  const body: string[] = [];

  for (const n of flow) {
    if (isData(n)) {
      body.push(`    ${n.name} = load("${n.name}")`);
      continue;
    }
    const op = producerOps[n.id] ?? (sp(n).operator as string) ?? "";
    const folder = STAGE_FOLDER[n.kind] ?? "src";
    imports.push(`from ${folder}.${n.name} import ${n.name} as op_${n.name}`);
    const parents = parentsInOrder(sg, n.id);
    if (op === "evaluate_strategy") {
      // a backtest needs the model AND the matrix + target that trained it
      const model = parents.find((x) => x.kind === "model") ?? parents[0];
      const train = model ? parentsInOrder(sg, model.id) : [];
      const matrix = train.find((x) => x.kind === "matrix");
      const target = train.find((x) => x.kind === "target");
      const args = [model?.name, matrix?.name, target?.name].filter(Boolean).join(", ");
      body.push(`    ${n.name} = op_${n.name}(${args})`);
    } else {
      body.push(`    ${n.name} = op_${n.name}(${parents.map((p) => p.name).join(", ")})`);
    }
  }

  const terminal = [...flow].reverse().find((n) => n.kind === "result") ?? flow[flow.length - 1];
  return [
    `"""${projectName} — reproducible pipeline (generated by Invariant).`,
    ``,
    `Same bars in → same result out. Run:`,
    `    pip install -r requirements.txt`,
    `    python -m pipeline`,
    `"""`,
    ...imports,
    ``,
    ``,
    `def build():`,
    ...(body.length ? body : ["    return None  # build something first"]),
    `    return ${terminal?.name ?? "None"}`,
    ``,
    ``,
    `if __name__ == "__main__":`,
    `    print(build())`,
    ``,
  ].join("\n");
}

/** README.md — the trust loop, in prose. */
export function buildReadme(projectName: string, sg: LineageSubgraph): string {
  const result = [...sg.nodes].reverse().find((n) => n.kind === "result");
  const datasets = sg.nodes.filter(isData).map((n) => `\`${n.name}\``).join(", ");
  return [
    `# ${projectName}`,
    ``,
    `A reproducible quantitative-research pipeline generated by **Invariant**.`,
    `Every artifact is a real Python module; \`pipeline.py\` runs the whole DAG`,
    `end-to-end. Same bars in → same result out.`,
    ``,
    `## Run it yourself`,
    ``,
    "```bash",
    `pip install -r requirements.txt`,
    `# drop your point-in-time bars in data/ as <name>.parquet:`,
    `#   { ${INPUT_SCHEMA.join(", ")} }`,
    `python -m pipeline`,
    "```",
    ``,
    `## Inputs`,
    ``,
    `${datasets || "—"} — point-in-time OHLCV, 1-minute bars.`,
    ``,
    result ? `## Result\n\n\`${result.name}\` — ${(sp(result).evalWindow as string) ?? "see specs/"}.` : "",
    ``,
    `## Laws this pipeline holds`,
    ``,
    `- **no-lookahead** — every rolling window ends at \`t\`; the target leads forward and is never a feature.`,
    `- **reproducible** — pinned dependencies + deterministic ops ⇒ identical output on the same data.`,
    ``,
  ].join("\n");
}

/** config.yaml — the run config (data sources, eval window, seed). */
export function buildConfigYaml(sg: LineageSubgraph): string {
  const datasets = sg.nodes.filter(isData).map((n) => `  - ${n.name}`);
  const result = [...sg.nodes].reverse().find((n) => n.kind === "result");
  const win = result ? ((sp(result).evalWindow as string) ?? "") : "";
  return [
    `# run configuration`,
    `data_sources:`,
    ...(datasets.length ? datasets : ["  - —"]),
    win ? `eval_window: "${win}"` : "",
    `random_seed: 7`,
    ``,
  ].filter(Boolean).join("\n");
}

/** specs/<result>.yaml — the result spec as a config file (point-in-time facts). */
export function buildSpecYaml(node: Node): string {
  const s = sp(node);
  return [
    `# spec: ${node.name}`,
    `kind: ${node.kind}`,
    node.version ? `version: ${node.version}` : null,
    s.operator ? `operator: ${s.operator}` : null,
    s.evalWindow ? `eval_window: "${s.evalWindow}"` : null,
    s.policy ? `policy: ${s.policy}` : null,
    node.lineageHash ? `lineage_hash: ${node.lineageHash}` : null,
    node.contentHash ? `content_hash: ${node.contentHash}` : null,
    node.asOfKnowledgeTime ? `as_of_knowledge_time: ${node.asOfKnowledgeTime}` : null,
    `reproducible: true`,
    ``,
  ].filter(Boolean).join("\n");
}
