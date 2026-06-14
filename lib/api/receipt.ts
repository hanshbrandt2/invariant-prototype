// lib/api/receipt.ts — the contract mapping for ADR-0002's code & receipt
// surface (Phase-4 Slice 6 → 6b). Translates the REAL research-workbench DSL
// wire shapes into the frontend contract (`Receipt`, `AssembledCode`,
// `DagListItem` in lib/types). No schema drift: a missing/renamed wire field is
// a backend ticket, never a contract edit.
//
// REAL DAGs, not a synthetic demo. The platform's producing pipelines live in
// the DAG registry (`catalog/dags/*.yaml`), listed by GET /api/dsl/dags and
// fetched by GET /api/dsl/dags/{id} → {spec}. An artifact's `dag_id` points at
// one of these. The surface fetches a real spec and POSTs it to
// /api/dsl/{assemble,receipt} — so the code AND the DAG are real. A DAG whose
// operators aren't yet emittable returns a clean 422 (honest coverage); see
// receiptResultFrom(). The artifact→dag_id wiring (so a *result* opens its own
// receipt) is task #10 / the build-stream — this surface is the registry view.

import type {
  Receipt,
  ReceiptFile,
  AssembledCode,
  DagListItem,
  ReproducibilityClass,
} from "@/lib/types";

// ── upstream wire shapes (research-workbench api/dsl/schemas.py) ──────────────

/** rwb `DagAssembleResponse`. */
export interface DagAssembleResponse {
  source: string;
  imports: string[];
  input_ids: string[];
  output_ids: string[];
  reproducibility_class: ReproducibilityClass;
}

/** rwb `DagReceiptResponse` — `files` is a {filename: content} map. */
export interface DagReceiptResponse {
  files: Record<string, string>;
  input_ids: string[];
  output_names: string[];
  reproducibility_class: ReproducibilityClass;
}

/** rwb `DagSummary` (api/dsl/routers/dags.py) — one row per catalog/dags/*.yaml. */
export interface DagSummaryRead {
  id: string;
  stage: string;
  version: string;
  title: string | null;
  summary: string | null;
  description: string | null;
  file_path: string;
  resource_hint: string;
}

/** rwb `DagSpec` — full spec for one DAG (the `spec` is the runnable DAG dict). */
export interface DagSpecRead {
  id: string;
  stage: string;
  version: string;
  spec: Record<string, unknown>;
  resource_hint: string;
}

/** The DAG packaged by default — the one real catalog pipeline that fully
 *  emits today (a 15m target). As emit() coverage widens, more of the registry
 *  becomes packageable; the picker surfaces every DAG and its per-DAG status. */
export const DEFAULT_DAG_ID = "cl_15m_target_dag";

// ── mappers ──────────────────────────────────────────────────────────────────

export function dagSummaryToItem(s: DagSummaryRead): DagListItem {
  return {
    id: s.id,
    stage: s.stage,
    title: s.title,
    description: s.description,
    resourceHint: s.resource_hint,
  };
}

/** Filename → Code-lens language. Verbatim content; this only drives rendering. */
function langOf(name: string): ReceiptFile["lang"] {
  if (name.endsWith(".py")) return "python";
  if (name.endsWith(".toml")) return "toml";
  if (name.endsWith(".json")) return "json";
  return "text";
}

/** A stable display order for the receipt files — entrypoint first, manifest
 *  next, then the packaging. (The wire `files` map has no inherent order.) */
const FILE_ORDER = [
  "pipeline.py",
  "data.py",
  "receipt.json",
  "requirements.txt",
  "pyproject.toml",
];

export function receiptResponseToReceipt(r: DagReceiptResponse): Receipt {
  const files: ReceiptFile[] = Object.entries(r.files)
    .map(([name, content]) => ({ name, content, lang: langOf(name) }))
    .sort((a, b) => {
      const ia = FILE_ORDER.indexOf(a.name);
      const ib = FILE_ORDER.indexOf(b.name);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
    });
  return {
    files,
    inputIds: r.input_ids,
    outputNames: r.output_names,
    reproducibilityClass: r.reproducibility_class,
    entrypoint: "pipeline.py",
  };
}

export function assembleResponseToAssembled(
  r: DagAssembleResponse,
): AssembledCode {
  return {
    source: r.source,
    imports: r.imports,
    inputIds: r.input_ids,
    outputIds: r.output_ids,
    reproducibilityClass: r.reproducibility_class,
  };
}

/** rwb returns its 422 client-errors as `{"detail": "<message>"}`. Pull the
 *  message out for the honest "blocked" surface; fall back to the raw body. */
export function parseDetail(body: string | undefined): string {
  if (!body) return "unknown error";
  try {
    const j = JSON.parse(body) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
  } catch {
    /* not JSON — use raw */
  }
  return body.slice(0, 300);
}
