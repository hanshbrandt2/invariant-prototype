"use client";

import { useMemo, useState } from "react";
import type { LineageSubgraph, ProjectFile } from "@/lib/types";
import { buildProject, FOLDER_ORDER } from "@/lib/code-project";
import { deriveValidator } from "@/lib/data";
import { zipSync } from "@/lib/zip";
import { CodeBlock } from "@/components/workspace/code-lens";

const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");
const fileIcon = (lang: ProjectFile["lang"]) => (lang === "yaml" ? "⚖" : lang === "text" ? "≡" : "py");

/**
 * The Code view — the whole workspace as a real, runnable code project. A paper
 * file tree (left, searchable) organised by pipeline stage; a DARK editor pane
 * (right) with open-file tabs, the trust each file carries (✓ validated · 🔒
 * pins), and a one-click download of the whole runnable repo (.zip). Canvas ⟷
 * file selection stays in sync; in pipeline.py the canvas-selected node's block
 * is lit.
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
  const files = useMemo(() => buildProject(graph, producerOps, workspaceName), [graph, producerOps, workspaceName]);
  const byId = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n])), [graph]);
  const slug = workspaceName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  // open the selected node's file if there is one; otherwise the runnable entrypoint
  // (guard on selectedNodeId so we don't match the first file that simply has no nodeId)
  const initial = (selectedNodeId && files.find((f) => f.nodeId === selectedNodeId)?.path) || "pipeline.py";
  const [path, setPath] = useState(initial);
  const [openTabs, setOpenTabs] = useState<string[]>(() => [initial]);
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
    setOpenTabs((t) => (t.includes(f.path) ? t : [...t, f.path]));
    if (f.nodeId && onSelectNode) onSelectNode(f.nodeId);
  };

  const closeTab = (e: React.MouseEvent, p: string) => {
    e.stopPropagation();
    const idx = openTabs.indexOf(p);
    const next = openTabs.filter((x) => x !== p);
    setOpenTabs(next.length ? next : ["pipeline.py"]);
    if (p === path) setPath(next[idx] ?? next[idx - 1] ?? "pipeline.py");
  };

  const download = () => {
    const blob = zipSync(files.map((f) => ({ path: f.path, content: f.code })));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const FileRow = ({ f }: { f: ProjectFile }) => (
    <button
      onClick={() => open(f)}
      className={`flex w-full items-center gap-1.5 px-3 py-1 text-left font-mono text-[0.74rem] transition-colors ${f.path === path ? "bg-clay-wash text-clay-deep" : "text-ink-2 hover:bg-paper-2"}`}
      title={f.path}
    >
      <span className="text-faint shrink-0 w-5 text-[0.62rem]">{fileIcon(f.lang)}</span>
      <span className="truncate">{f.name}</span>
      {f.nodeId && f.nodeId === selectedNodeId && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clay shrink-0" title="the node selected on the canvas" />}
    </button>
  );

  return (
    <div className="flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-lg border border-hairline bg-white overflow-hidden flex">
      {/* file tree — editorial paper */}
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

      {/* code pane — DARK editor (Lovable-like): tabs · validated + download · code */}
      <div className="flex-1 min-w-0 flex flex-col bg-ink">
        {/* tabs row */}
        <div className="shrink-0 flex items-stretch border-b border-[#2c2a24] bg-[#1b1a16]">
          <div className="flex-1 flex items-stretch overflow-x-auto">
            {openTabs.map((p) => {
              const tf = files.find((x) => x.path === p);
              if (!tf) return null;
              const ac = p === path;
              return (
                <div
                  key={p}
                  onClick={() => setPath(p)}
                  className={`group flex items-center gap-2 px-3 py-2 border-r border-[#2c2a24] cursor-pointer font-mono text-[0.72rem] whitespace-nowrap ${ac ? "bg-ink text-paper" : "text-[#8a8478] hover:text-paper"}`}
                  title={tf.path}
                >
                  <span className="text-[0.6rem] text-[#6f6a5e]">{fileIcon(tf.lang)}</span>
                  <span>{tf.name}</span>
                  <button
                    onClick={(e) => closeTab(e, p)}
                    className={`text-[0.9rem] leading-none text-[#6f6a5e] hover:text-paper ${ac ? "" : "opacity-0 group-hover:opacity-100"}`}
                    aria-label={`close ${tf.name}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 px-3 shrink-0 border-l border-[#2c2a24]">
            {validator && <span className={`font-mono text-[0.6rem] uppercase tracking-[0.1em] ${ok ? "text-[#7fae5a]" : "text-clay"}`}>{ok ? "✓ validated" : "! blocked"}</span>}
            <button
              onClick={download}
              title="download the whole runnable repo as a .zip"
              className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-[#b6b0a3] hover:text-paper border border-[#3a382f] hover:border-[#5a564a] rounded px-2 py-1 transition-colors"
            >
              ⬇ project.zip
            </button>
          </div>
        </div>

        {/* path + pins sub-bar */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-1.5 border-b border-[#2c2a24] bg-[#1b1a16]">
          <span className="font-mono text-[0.7rem] text-[#8a8478] truncate">{file?.path}</span>
          {pinChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
              {pinChips.map((p, i) => (
                <span key={i} className="font-mono text-[0.56rem] text-[#d9b36b] border border-[#5a4a2a] rounded px-1.5 leading-[1.6]">🔒 {p}</span>
              ))}
            </div>
          )}
        </div>

        {/* code */}
        <div className="flex-1 overflow-auto">
          {file && <CodeBlock code={file.code} highlightName={highlight} flush />}
        </div>

        <p className="shrink-0 px-4 py-2 border-t border-[#2c2a24] bg-[#1b1a16] font-mono text-[0.6rem] text-[#6f6a5e]">
          read-only · git clone → pip install -r requirements.txt → python -m pipeline → identical result
        </p>
      </div>
    </div>
  );
}
