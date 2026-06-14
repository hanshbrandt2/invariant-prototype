// lib/api/receipt.ts — the contract mapping for ADR-0002's code & receipt
// surface (Phase-4 Slice 6). Translates the REAL research-workbench DSL codegen
// wire shapes (POST /api/dsl/assemble, /api/dsl/receipt — snake_case Pydantic,
// served straight out of dsl-engine's `assemble_dag` / `build_receipt`) into the
// frontend contract (`Receipt`, `AssembledCode` in lib/types). No schema drift:
// a missing/renamed wire field is a backend ticket, never a contract edit.
//
// THE INPUT DAG IS A LABELLED DEMO. Real artifacts carry DAG-*run* metadata
// (dag_id / from_node / run_id / output_blob_path), NOT the producing
// TransformNode graph — so today there is no real DAG to package from a stored
// artifact (the artifact→TransformNode gap, tracked as task #10). That closes
// only when the UI builds the DAG itself (the build-stream, MIGRATION step 3).
// Until then we drive the live endpoints with DEMO_DAG so the *code & receipt
// are real* (produced by the real codegen over the real rwb endpoint) even
// though the *input DAG* is a placeholder. Honesty bar: the surface says so.

import type {
  Receipt,
  ReceiptFile,
  AssembledCode,
  ReproducibilityClass,
} from "@/lib/types";

// ── upstream wire shapes (research-workbench api/dsl/schemas.py) ──────────────

/** rwb `DagAssembleResponse`. */
export interface DagAssembleResponse {
  source: string;
  imports: string[];
  input_ids: string[];
  output_id: string;
  reproducibility_class: ReproducibilityClass;
}

/** rwb `DagReceiptResponse` — `files` is a {filename: content} map. */
export interface DagReceiptResponse {
  files: Record<string, string>;
  input_ids: string[];
  output_name: string;
  reproducibility_class: ReproducibilityClass;
}

// ── mappers ──────────────────────────────────────────────────────────────────

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
    outputName: r.output_name,
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
    outputId: r.output_id,
    reproducibilityClass: r.reproducibility_class,
  };
}

// ── the labelled demo DAG ─────────────────────────────────────────────────────
// A minimal two-node DAG: join two inputs, then derive a blended column. It
// exercises three of the four keystone emit() patterns (multi-input/named-frame
// `join`, the expression-AST renderer `derive_column`) and assembles into a
// runnable `run(frame_prices, frame_signals) -> result`. Kept here (server-side)
// so the browser never has to know DSL internals; replaced by build-stream DAGs.

type DagDict = Record<string, unknown>;

function inputNode(id: string, ref: string): DagDict {
  return {
    type: "input",
    id,
    artifact_ref: ref,
    domain_transition: { from: "grid_dense", to: "grid_dense" },
    representation_transition: {
      from: "generic_contract",
      to: "generic_contract",
    },
  };
}

function transformNode(
  id: string,
  operator: string,
  inputs: string[],
  parameters: DagDict,
): DagDict {
  return {
    type: "transform",
    id,
    operator,
    inputs,
    domain_transition: { from: "grid_dense", to: "grid_dense" },
    representation_transition: {
      from: "generic_contract",
      to: "generic_contract",
    },
    parameters,
    row_behavior: "row_preserving",
    output_schema: { adds: [], removes: [] },
  };
}

export const DEMO_DAG: DagDict = {
  id: "invariant_demo_blend",
  stage: "feature",
  inputs: [
    inputNode("prices", "dataset:cl_front_1m:1"),
    inputNode("signals", "dataset:cl_sig:1"),
  ],
  nodes: [
    transformNode("j", "join", ["prices", "signals"], {
      join_type: "left",
      on: ["key"],
    }),
    transformNode("feat", "derive_column", ["j"], {
      expression: "(left_val + right_val) / 2",
      output_column: "blend",
    }),
  ],
  outputs: [{ id: "out", artifact_type: "feature", from_node: "feat" }],
};
