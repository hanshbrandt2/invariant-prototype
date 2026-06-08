"use client";

import { useMemo, useState } from "react";
import type { LineageSubgraph, ProjectFile } from "@/lib/types";
import { buildProject, FOLDER_ORDER } from "@/lib/code-project";
import { deriveValidator } from "@/lib/data";
import { CodeBlock } from "@/components/workspace/code-lens";

const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");

/**
 * The Code view — the whole workspace as a reproducible code project. A file
 * tree (left) organised by pipeline stage, a read-only code pane (right). Each
 * file carries the trust that travels with it (✓ validated · 🔒 pins), so
 * "reproducible" is stamped on the artifact you can actually run. Entering the
 * view opens the canvas-selected node's file; the whole codebase is browsable.
 */
export function CodeView({
  graph,
  producerOps,
  selectedNodeId,
  workspaceName,
}: {
  graph: LineageSubgraph;
  producerOps: Record<string, string>;
  selectedNodeId?: string;
  workspaceName: string;
}) {
  const files = useMemo(() => buildProject(graph, producerOps), [graph, producerOps]);
  const byId = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n])), [graph]);

  const initial = files.find((f) => f.nodeId === selectedNodeId)?.path ?? "pipeline.py";
  const [path, setPath] = useState(initial);
  const file = files.find((f) => f.path === path) ?? files[0];

  const byFolder: Record<string, ProjectFile[]> = {};
  for (const f of files) (byFolder[f.folder] ??= []).push(f);
  const folders = FOLDER_ORDER.filter((f) => byFolder[f]?.length);
  const rootFiles = byFolder[""] ?? [];

  const node = file?.nodeId ? byId[file.nodeId] : undefined;
  const validator = node && node.kind !== "dataset" && node.kind !== "raw-dataset" && node.kind !== "policy" ? deriveValidator(node, graph) : undefined;
  const ok = !!validator && validator.p1 === "pass" && validator.p2 === "pass" && validator.p3 === "pass" && validator.reproducible;
  const pinChips: string[] = validator ? ["no-lookahead", "reproducible", ...((node?.policyRefs ?? []).map(friendlyPolicy))] : [];

  const FileRow = ({ f }: { f: ProjectFile }) => (
    <button
      onClick={() => setPath(f.path)}
      className={`flex w-full items-center gap-1.5 px-3 py-1 text-left font-mono text-[0.74rem] transition-colors ${f.path === path ? "bg-clay-wash text-clay-deep" : "text-ink-2 hover:bg-paper-2"}`}
      title={f.path}
    >
      <span className="text-faint shrink-0 w-5 text-[0.62rem]">{f.lang === "yaml" ? "⚖" : f.lang === "text" ? "≡" : "py"}</span>
      <span className="truncate">{f.name}</span>
      {f.nodeId && f.nodeId === selectedNodeId && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clay shrink-0" title="the node selected on the canvas" />}
    </button>
  );

  return (
    <div className="flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-lg border border-hairline bg-white overflow-hidden flex">
      {/* file tree */}
      <div className="w-[232px] shrink-0 overflow-y-auto border-r border-hairline bg-paper-2/50 py-2">
        <p className="px-3 pb-1.5 font-mono text-[0.74rem] text-ink">{workspaceName}/</p>
        {folders.map((folder) => (
          <div key={folder} className="mb-1.5">
            <p className="px-3 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">{folder}/</p>
            {byFolder[folder].map((f) => (
              <FileRow key={f.path} f={f} />
            ))}
          </div>
        ))}
        {rootFiles.length > 0 && (
          <div className="mt-1 border-t border-hairline pt-1.5">
            {rootFiles.map((f) => (
              <FileRow key={f.path} f={f} />
            ))}
          </div>
        )}
      </div>

      {/* code pane */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {file && (
          <>
            {/* file header — path + the trust that travels with it */}
            <div className="sticky top-0 z-10 border-b border-hairline bg-white/95 backdrop-blur-sm px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.82rem] text-ink truncate">{file.path}</span>
                {validator && <span className={`shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] ${ok ? "text-green" : "text-clay"}`}>{ok ? "✓ validated" : "! blocked"}</span>}
              </div>
              {pinChips.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {pinChips.map((p, i) => (
                    <span key={i} className="font-mono text-[0.58rem] text-clay-deep bg-clay-wash border border-clay/40 px-1.5 leading-[1.6]">🔒 {p}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5">
              <CodeBlock code={file.code} highlightName={node?.name} />
            </div>
            <p className="px-5 pb-5 -mt-2 font-mono text-[0.62rem] text-faint">read-only · change the workflow in chat or on the canvas · export to run it yourself</p>
          </>
        )}
      </div>
    </div>
  );
}
