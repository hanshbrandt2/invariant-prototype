import type { LineageSubgraph, Node, ProjectFile } from "@/lib/types";
import { genCodeMap } from "@/lib/data";

/**
 * The workspace as a reproducible code project — every artifact is a file under
 * its pipeline-stage folder, mirroring the canvas lanes, plus a runnable
 * `pipeline.py` (the whole DAG end-to-end) and `requirements.txt`. The Code view
 * browses this; clicking a graph node opens its file. Built from the live graph
 * + the same per-node codegen the inspector uses — nothing fabricated.
 */

const FOLDER: Record<string, string> = {
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

export const FOLDER_ORDER = ["data", "features", "matrices", "targets", "models", "results", "policies"];

function policyYaml(n: Node): string {
  const s = (n.spec ?? {}) as { policyClass?: string; intendedInvariant?: string; scopeOfApplicability?: string[]; reviewStatus?: string; author?: string };
  const scope = (s.scopeOfApplicability ?? []).map((x) => `  - ${x}`).join("\n") || "  - —";
  return [
    `# policy: ${n.name}`,
    `policy_class: ${s.policyClass ?? "—"}`,
    `intended_invariant: >`,
    `  ${s.intendedInvariant ?? ""}`,
    `scope_of_applicability:`,
    scope,
    `review_status: ${s.reviewStatus ?? "—"}`,
    `author: ${s.author ?? "platform"}`,
    "",
  ].join("\n");
}

export function buildProject(graph: LineageSubgraph, producerOps: Record<string, string>): ProjectFile[] {
  const codeMap = genCodeMap(graph, producerOps);
  const files: ProjectFile[] = [];
  for (const n of graph.nodes) {
    const folder = FOLDER[n.kind];
    if (!folder) continue; // operators / unknown kinds aren't files
    const isPolicy = n.kind === "policy";
    const lang: ProjectFile["lang"] = isPolicy ? "yaml" : "python";
    const name = `${n.name}.${isPolicy ? "yaml" : "py"}`;
    const code = isPolicy ? policyYaml(n) : codeMap[n.id] ?? `# ${n.name}\n# (no code generated for this artifact yet)\n`;
    files.push({ path: `${folder}/${name}`, folder, name, lang, code, nodeId: n.id });
  }
  // pipeline.py — the whole DAG, runnable end to end (the terminal result's code
  // already threads every upstream step).
  const terminal = [...graph.nodes].reverse().find((n) => n.kind === "result") ?? graph.nodes[graph.nodes.length - 1];
  files.push({
    path: "pipeline.py",
    folder: "",
    name: "pipeline.py",
    lang: "python",
    code: codeMap[terminal?.id ?? ""] ?? "# the full pipeline — build something first\n",
    nodeId: terminal?.id,
  });
  files.push({
    path: "requirements.txt",
    folder: "",
    name: "requirements.txt",
    lang: "text",
    code: "polars>=0.20\nnumpy>=1.26\nscikit-learn>=1.4\n",
  });
  return files;
}
