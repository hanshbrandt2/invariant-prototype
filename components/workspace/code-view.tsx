"use client";

import { useMemo, useState } from "react";
import type { LineageSubgraph, ProjectFile } from "@/lib/types";
import { buildProject, FOLDER_ORDER } from "@/lib/code-project";
import { deriveValidator } from "@/lib/data";
import { zipSync } from "@/lib/zip";
import { CodeBlock } from "@/components/workspace/code-lens";

const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");

/** A small colour-coded file-type glyph, like a real editor's file icons. */
function FileIcon({ name, lang }: { name: string; lang: ProjectFile["lang"] }) {
  const [glyph, color] =
    lang === "python" ? ["py", "#5a9fd4"]
    : lang === "yaml" ? ["{}", "#d9b36b"]
    : name.endsWith(".md") ? ["md", "#7aa6c9"]
    : ["≡", "#7a766a"];
  return <span className="shrink-0 w-6 text-center font-mono text-[0.5rem] leading-none" style={{ color }}>{glyph}</span>;
}

/**
 * The Code view — the whole workspace as a real, runnable code project, shown as
 * a dark IDE: a collapsible file tree (left, searchable, file-type icons) and a
 * dark editor pane (right) with open-file tabs, multi-colour syntax highlighting,
 * the trust each file carries (✓ validated · 🔒 pins), and a one-click download
 * of the whole runnable repo (.zip). Canvas ⟷ file selection stays in sync.
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
  onSelectNode?: (id: string) => void;
}) {
  const files = useMemo(() => buildProject(graph, producerOps, workspaceName), [graph, producerOps, workspaceName]);
  const byId = useMemo(() => Object.fromEntries(graph.nodes.map((n) => [n.id, n])), [graph]);
  const slug = workspaceName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  const initial = (selectedNodeId && files.find((f) => f.nodeId === selectedNodeId)?.path) || "pipeline.py";
  const [path, setPath] = useState(initial);
  const [openTabs, setOpenTabs] = useState<string[]>(() => [initial]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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
  const toggleFolder = (f: string) => setCollapsed((c) => { const n = new Set(c); if (n.has(f)) n.delete(f); else n.add(f); return n; });
  const download = () => {
    const blob = zipSync(files.map((f) => ({ path: f.path, content: f.code })));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${slug}.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  const FileRow = ({ f, indent }: { f: ProjectFile; indent: boolean }) => {
    const active = f.path === path;
    return (
      <button
        onClick={() => open(f)}
        className={`flex w-full items-center gap-1 py-[3px] pr-2 text-left font-mono text-[0.7rem] border-l-2 transition-colors ${indent ? "pl-4" : "pl-2"} ${active ? "bg-[#2f2c22] border-clay text-[#f0ebe0]" : "border-transparent text-[#a59f92] hover:bg-[#26241d] hover:text-[#d6d0c4]"}`}
        title={f.path}
      >
        <FileIcon name={f.name} lang={f.lang} />
        <span className="truncate">{f.name}</span>
        {f.nodeId && f.nodeId === selectedNodeId && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clay shrink-0" title="selected on the canvas" />}
      </button>
    );
  };

  return (
    <div className="flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-lg border border-[#2c2a24] bg-[#17160f] overflow-hidden flex">
      {/* file tree — dark IDE explorer */}
      <div className="w-[220px] shrink-0 overflow-y-auto border-r border-[#2c2a24] bg-[#1c1b15] flex flex-col">
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-[#2c2a24]">
          <p className="px-0.5 pb-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-[#8a8478]">{workspaceName}</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search files…"
            className="w-full bg-[#14130d] border border-[#2c2a24] px-2 py-1 font-mono text-[0.66rem] text-[#b6b0a3] outline-none focus:border-[#46443a] placeholder:text-[#5a564a]"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1.5">
          {folders.map((folder) => {
            const isOpen = !collapsed.has(folder);
            return (
              <div key={folder}>
                <button
                  onClick={() => toggleFolder(folder)}
                  className="flex w-full items-center gap-1 px-2 py-[3px] text-left font-mono text-[0.66rem] text-[#cfc8b8] hover:bg-[#26241d] transition-colors"
                >
                  <span className="inline-block w-3 text-[#6f6a5e] text-[0.55rem]">{isOpen ? "▾" : "▸"}</span>
                  <span className="text-[#b6b0a3]">{folder}</span>
                </button>
                {isOpen && byFolder[folder].map((f) => <FileRow key={f.path} f={f} indent />)}
              </div>
            );
          })}
          {rootFiles.length > 0 && (
            <div className="mt-1 border-t border-[#2c2a24] pt-1">
              {rootFiles.map((f) => <FileRow key={f.path} f={f} indent={false} />)}
            </div>
          )}
          {shown.length === 0 && <p className="px-3 py-2 font-mono text-[0.64rem] text-[#5a564a]">no files match “{query}”.</p>}
        </div>
      </div>

      {/* code pane — dark editor: tabs · validated + download · code */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#17160f]">
        <div className="shrink-0 flex items-stretch border-b border-[#2c2a24] bg-[#1c1b15]">
          <div className="flex-1 flex items-stretch overflow-x-auto">
            {openTabs.map((p) => {
              const tf = files.find((x) => x.path === p);
              if (!tf) return null;
              const ac = p === path;
              return (
                <div
                  key={p}
                  onClick={() => setPath(p)}
                  className={`group flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 border-r border-[#2c2a24] cursor-pointer font-mono text-[0.7rem] whitespace-nowrap ${ac ? "bg-[#17160f] text-[#f0ebe0]" : "text-[#8a8478] hover:text-[#d6d0c4]"}`}
                  title={tf.path}
                >
                  <FileIcon name={tf.name} lang={tf.lang} />
                  <span>{tf.name}</span>
                  <button onClick={(e) => closeTab(e, p)} className={`ml-0.5 text-[0.85rem] leading-none text-[#6f6a5e] hover:text-paper ${ac ? "" : "opacity-0 group-hover:opacity-100"}`} aria-label={`close ${tf.name}`}>×</button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 px-3 shrink-0 border-l border-[#2c2a24]">
            {validator && <span className={`font-mono text-[0.58rem] uppercase tracking-[0.1em] ${ok ? "text-[#7fae5a]" : "text-clay"}`}>{ok ? "✓ validated" : "! blocked"}</span>}
            <button onClick={download} title="download the whole runnable repo as a .zip" className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[#b6b0a3] hover:text-paper border border-[#3a382f] hover:border-[#5a564a] rounded px-2 py-1 transition-colors">⬇ project.zip</button>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-1.5 border-b border-[#2c2a24] bg-[#1c1b15]">
          <span className="font-mono text-[0.66rem] text-[#8a8478] truncate">{file?.path}</span>
          {pinChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
              {pinChips.map((p, i) => <span key={i} className="font-mono text-[0.54rem] text-[#d9b36b] border border-[#5a4a2a] rounded px-1.5 leading-[1.6]">🔒 {p}</span>)}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {file && <CodeBlock code={file.code} highlightName={highlight} flush />}
        </div>

        <p className="shrink-0 px-4 py-2 border-t border-[#2c2a24] bg-[#1c1b15] font-mono text-[0.58rem] text-[#5a564a]">
          read-only · git clone → pip install -r requirements.txt → python -m pipeline → identical result
        </p>
      </div>
    </div>
  );
}
