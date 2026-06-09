import type { LineageSubgraph, Node, ProjectFile } from "@/lib/types";
import {
  buildModule,
  buildPipeline,
  buildReadme,
  buildConfigYaml,
  buildSpecYaml,
  buildPyproject,
  moduleNames,
  MODULE_OF_KIND,
  PACKAGE,
  REQUIREMENTS,
  DATA_PY,
  INIT_PY,
  GITIGNORE,
} from "@/lib/fixtures/code";

/**
 * The workspace as a REAL, idiomatic, pip-installable Python package. Functions
 * are grouped by stage into modules under `invariant_research/` (features.py,
 * targets.py, models.py, strategy.py) — not one file per artifact — with a
 * `data.py` loader, a module-qualified `pipeline.py`, `pyproject.toml`, pinned
 * `requirements.txt`, and the policies + result specs as YAML. The Code view
 * browses this; selecting a graph node opens its module and lights its function.
 */

export const FOLDER_ORDER = [PACKAGE, "policies", "specs"];

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

const isData = (n: Node) => n.kind === "dataset" || n.kind === "raw-dataset";

export function buildProject(graph: LineageSubgraph, producerOps: Record<string, string>, projectName = "pipeline"): ProjectFile[] {
  const files: ProjectFile[] = [];
  const py = (path: string, code: string, nodeIds?: string[]): ProjectFile => ({ path, folder: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "", name: path.slice(path.lastIndexOf("/") + 1), lang: "python", code, nodeIds });
  const file = (path: string, lang: ProjectFile["lang"], code: string, nodeId?: string): ProjectFile => ({ path, folder: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "", name: path.slice(path.lastIndexOf("/") + 1), lang, code, nodeId });

  // the package
  files.push(py(`${PACKAGE}/__init__.py`, INIT_PY));
  files.push(py(`${PACKAGE}/data.py`, DATA_PY));
  for (const mod of moduleNames(graph)) {
    const nodeIds = graph.nodes.filter((n) => !isData(n) && n.kind !== "policy" && MODULE_OF_KIND[n.kind] === mod).map((n) => n.id);
    files.push(py(`${PACKAGE}/${mod}.py`, buildModule(mod, graph, producerOps), nodeIds));
  }
  const terminal = [...graph.nodes].reverse().find((n) => n.kind === "result") ?? graph.nodes[graph.nodes.length - 1];
  files.push(py(`${PACKAGE}/pipeline.py`, buildPipeline(graph, producerOps, projectName), terminal ? [terminal.id] : undefined));

  // governance + specs as YAML
  for (const n of graph.nodes) {
    if (n.kind === "policy") files.push(file(`policies/${n.name}.yaml`, "yaml", policyYaml(n), n.id));
    if (n.kind === "result") files.push(file(`specs/${n.name}.yaml`, "yaml", buildSpecYaml(n), n.id));
  }

  // project root — packaging + deps + config + readme
  files.push(file("pyproject.toml", "text", buildPyproject(projectName)));
  files.push(file("requirements.txt", "text", REQUIREMENTS));
  files.push(file("config.yaml", "yaml", buildConfigYaml(graph)));
  files.push(file("README.md", "text", buildReadme(projectName, graph)));
  files.push(file(".gitignore", "text", GITIGNORE));

  return files;
}
