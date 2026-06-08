"use client";

import { useMemo, useState } from "react";
import type { LineageSubgraph, ProjectFile } from "@/lib/types";
import { buildProject, FOLDER_ORDER } from "@/lib/code-project";
import { deriveValidator } from "@/lib/data";
import { CodeBlock } from "@/components/workspace/code-lens";

const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");

/**
 * The Code view — the whole workspace as a reproducible code project. A file
 * tree (left, searchable) organised by pipeline stage, a read-only code pane
 * (right). Each file carries the trust that travels with it (✓ validated · 🔒
 * pins), so "reproducible" is stamped on the artifact you can actually run.
 * Canvas ⟷ file selection stays in sync both ways; in pipeline.py the
 * canvas-selected node's block is lit.
 */
export function CodeView({
  graph,
  producerOps,
  selectedNodeId,
  workspaceName,
  onSelectNode,
}: {
  graph: LineageSubgraph;
  producerOps: Record<string, string>;
  selectedNodeId?: string;
  workspaceName: string;
  onSelectNode?: (id: string) => void; // clicking a file highlights its node back on the canvas
}) {
  const files = useMemo(() => buildProject(graph, producerOps), [graph, producerOps]);
  const byId = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n])), [graph]);

  const initial = files.find((f) => f.nodeId === selectedNodeId)?.path ?? "pipeline.py";
  const [path, setPath] = useState(initial);
  const [query, setQuery] = useState("");
  const file = files.find((f) => f.path === path) ?? files[0];

  const shown = query.trim() ? files.filter((f) => f.path.toLowerCase().includes(query.trim().toLowerCase())) : files;
  const byFolder: Record<string, ProjectFile[]> = {};
  for (const f of shown) (byFolder[f.folder] ??= []).push(f);
  const folders = FOLDER_ORDER.filter((f) => byFolder[f]?.length);
  const rootFiles = byFolder[""] ?? [];

  const node = file?.nodeId ? byId[file.nodeId] : undefined;
  const validator = node && node.kind !== "dataset" && node.kind !== "raw-dataset" && node.kind !== "policy" ? deriveValidator(node, graph) : undefined;
  const ok = !!validator && validator.p1 === "pass" && validator.p2 === "pass" && validator.p3 === "pass" && validator.reproducible;
  const pinChips: string[] = validator ? ["no-lookahead", "reproducible", ...((node?.policyRefs ?? []).map(friendlyPolicy))] : [];

  // in pipeline.py, light the canvas-selected node's block; elsewhere the file's own
  const selNode = selectedNodeId ? byId[selectedNodeId] : undefined;
  const highlight = file?.path === "pipeline.py" && selNode ? selNode.name : node?.name;

  const open = (f: ProjectFile) => {
    setPath(f.path);
    if (f.nodeId && onSelectNode) onSelectNode(f.nodeId);
  };

  const FileRow = ({ f }: { f: ProjectFile }) => (
    <button
      onClick={() => open(f)}
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
      <div className="w-[232px] shrink-0 overflow-y-auto border-r border-hairline bg-paper-2/50 flex flex-col">
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-hairline">
          <p className="px-0.5 pb-1.5 font-mono text-[0.74rem] text-ink">{workspaceName}/</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search files…"
            className="w-full bg-white border border-hairline px-2 py-1 font-mono text-[0.68rem] text-ink-2 outline-none focus:border-hairline-2 placeholder:text-faint"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
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
          {shown.length === 0 && <p className="px-3 py-2 font-mono text-[0.66rem] text-faint">no files match “{query}”.</p>}
        </div>
      </div>

      {/* code pane */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {file && (
          <>
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
              <CodeBlock code={file.code} highlightName={highlight} />
            </div>
            <p className="px-5 pb-5 -mt-2 font-mono text-[0.62rem] text-faint">read-only · change the workflow in chat or on the canvas · export to run it yourself</p>
          </>
        )}
      </div>
    </div>
  );
}
