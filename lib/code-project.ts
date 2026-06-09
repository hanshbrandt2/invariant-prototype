import type { LineageSubgraph, Node, ProjectFile } from "@/lib/types";
import {
  buildCodeMap,
  buildPipeline,
  buildReadme,
  buildConfigYaml,
  buildSpecYaml,
  REQUIREMENTS,
  LOAD_PY,
  GITIGNORE,
  STAGE_FOLDER,
} from "@/lib/fixtures/code";

/**
 * The workspace as a REAL, runnable code project — every artifact is a Python
 * module under its pipeline-stage folder (mirroring the canvas lanes), a
 * `data/load.py` seam, a `pipeline.py` that runs the whole DAG end-to-end, the
 * policies + result specs as YAML, and a pinned `requirements.txt`. The Code
 * lens browses this; clicking a graph node opens its file. Built from the live
 * graph + the same per-node codegen the inspector uses — nothing fabricated.
 */

export const FOLDER_ORDER = ["data", "features", "matrices", "targets", "models", "results", "policies", "specs"];

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

export function buildProject(graph: LineageSubgraph, producerOps: Record<string, string>, projectName = "pipeline"): ProjectFile[] {
  const codeMap = buildCodeMap(graph, producerOps);
  const files: ProjectFile[] = [];

  // per-dataset + per-artifact modules (and policies as YAML), by stage folder
  for (const n of graph.nodes) {
    const folder = STAGE_FOLDER[n.kind];
    if (!folder) continue; // operators / unknown kinds aren't files
    if (n.kind === "policy") {
      files.push({ path: `policies/${n.name}.yaml`, folder: "policies", name: `${n.name}.yaml`, lang: "yaml", code: policyYaml(n), nodeId: n.id });
      continue;
    }
    const code = codeMap[n.id];
    if (code == null) continue;
    files.push({ path: `${folder}/${n.name}.py`, folder, name: `${n.name}.py`, lang: "python", code, nodeId: n.id });
  }

  // each result's spec, as a config file alongside the code
  for (const n of graph.nodes) {
    if (n.kind === "result") {
      files.push({ path: `specs/${n.name}.yaml`, folder: "specs", name: `${n.name}.yaml`, lang: "yaml", code: buildSpecYaml(n), nodeId: n.id });
    }
  }

  // the one data seam
  files.push({ path: "data/load.py", folder: "data", name: "load.py", lang: "python", code: LOAD_PY });

  // project root — runnable entrypoint + deps + config + readme
  const terminal = [...graph.nodes].reverse().find((n) => n.kind === "result") ?? graph.nodes[graph.nodes.length - 1];
  files.push({ path: "pipeline.py", folder: "", name: "pipeline.py", lang: "python", code: buildPipeline(graph, producerOps, projectName), nodeId: terminal?.id });
  files.push({ path: "requirements.txt", folder: "", name: "requirements.txt", lang: "text", code: REQUIREMENTS });
  files.push({ path: "config.yaml", folder: "", name: "config.yaml", lang: "yaml", code: buildConfigYaml(graph) });
  files.push({ path: "README.md", folder: "", name: "README.md", lang: "text", code: buildReadme(projectName, graph) });
  files.push({ path: ".gitignore", folder: "", name: ".gitignore", lang: "text", code: GITIGNORE });

  return files;
}
