"use client";

import { useMemo, useState } from "react";
import type { LineageSubgraph, ProjectFile } from "@/lib/types";
import { buildProject, FOLDER_ORDER } from "@/lib/code-project";
import { deriveValidator } from "@/lib/data";
import { zipSync } from "@/lib/zip";
import { CodeBlock } from "@/components/workspace/code-lens";

const friendlyPolicy = (p: string) => (p.split(":")[1] ?? p).replace(/_/g, " ");

/** A small, low-chroma file-type glyph in the editorial palette. */
function FileIcon({ name, lang }: { name: string; lang: ProjectFile["lang"] }) {
  const [glyph, color] =
    lang === "python" ? ["py", "#3a5a78"]
    : lang === "yaml" ? ["{}", "#9a6a2f"]
    : name.endsWith(".md") ? ["md", "#7a8a9a"]
    : ["≡", "#B5AFA2"];
  return <span className="shrink-0 w-5 text-center font-mono text-micro leading-none" style={{ color }}>{glyph}</span>;
}

/**
 * The Code view — the workspace as a real, pip-installable Python package, shown
 * as an editorial IDE: a collapsible paper file tree (left, searchable) and a
 * light editor pane (right) with open-file tabs, restrained syntax highlighting,
 * and a status bar carrying the trust each artifact holds. Selecting a graph node
 * opens its module and lights its function (go-to-symbol); clicking a file with a
 * single artifact selects it back on the canvas.
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
  const inFile = (f: ProjectFile | undefined, id?: string) => !!id && (f?.nodeId === id || (f?.nodeIds?.includes(id) ?? false));

  const pipelinePath = files.find((f) => f.name === "pipeline.py")?.path ?? files[0]?.path ?? "";
  const initial = (selectedNodeId && files.find((f) => inFile(f, selectedNodeId))?.path) || pipelinePath;
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

  const selNode = selectedNodeId ? byId[selectedNodeId] : undefined;
  // the artifact in focus for trust display: the selected node when its code is
  // in the open file; otherwise a single-artifact file's own node (e.g. a spec).
  const node = selNode && inFile(file, selNode.id) ? selNode : file?.nodeId ? byId[file.nodeId] : undefined;
  const validator = node && node.kind !== "dataset" && node.kind !== "raw-dataset" && node.kind !== "policy" ? deriveValidator(node, graph) : undefined;
  const ok = !!validator && validator.p1 === "pass" && validator.p2 === "pass" && validator.p3 === "pass" && validator.reproducible;
  const pinChips: string[] = validator ? ["no-lookahead", "reproducible", ...((node?.policyRefs ?? []).map(friendlyPolicy))] : [];
  const highlight = selNode?.name;

  const open = (f: ProjectFile) => {
    setPath(f.path);
    setOpenTabs((t) => (t.includes(f.path) ? t : [...t, f.path]));
    const only = f.nodeIds?.length === 1 ? f.nodeIds[0] : f.nodeId;
    if (only && onSelectNode) onSelectNode(only);
  };
  const closeTab = (e: React.MouseEvent, p: string) => {
    e.stopPropagation();
    const idx = openTabs.indexOf(p);
    const next = openTabs.filter((x) => x !== p);
    setOpenTabs(next.length ? next : [pipelinePath]);
    if (p === path) setPath(next[idx] ?? next[idx - 1] ?? pipelinePath);
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
        className={`flex w-full items-center gap-1.5 py-[3px] pr-2 text-left font-mono text-meta border-l-2 transition-colors ${indent ? "pl-5" : "pl-2.5"} ${active ? "bg-clay-wash border-clay text-clay-deep" : "border-transparent text-ink-2 hover:bg-paper"}`}
        title={f.path}
      >
        <FileIcon name={f.name} lang={f.lang} />
        <span className="truncate">{f.name}</span>
        {inFile(f, selectedNodeId) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-clay shrink-0" title="selected on the canvas" />}
      </button>
    );
  };

  return (
    <div className="rise flex-1 min-w-0 relative mx-3 mb-3 mt-0.5 rounded-lg border border-hairline bg-white overflow-hidden flex" style={{ animationDelay: "110ms" }}>
      {/* file tree */}
      <div className="w-[216px] shrink-0 overflow-y-auto border-r border-hairline bg-paper-2/60 flex flex-col">
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-hairline">
          <p className="px-0.5 pb-1.5 font-mono text-meta uppercase tracking-[0.14em] text-muted">{workspaceName}</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search files…"
            className="w-full bg-white border border-hairline px-2 py-1 font-mono text-meta text-ink-2 outline-none focus:border-hairline-2 placeholder:text-faint"
          />
        </div>
        <div className="flex-1 overflow-y-auto py-1.5">
          {folders.map((folder) => {
            const isOpen = !collapsed.has(folder);
            return (
              <div key={folder}>
                <button onClick={() => toggleFolder(folder)} className="flex w-full items-center gap-1 px-2 py-[3px] text-left font-mono text-meta text-ink-2 hover:bg-paper transition-colors">
                  <span className="inline-block w-3 text-faint text-micro">{isOpen ? "▾" : "▸"}</span>
                  <span>{folder}</span>
                </button>
                {isOpen && byFolder[folder].map((f) => <FileRow key={f.path} f={f} indent />)}
              </div>
            );
          })}
          {rootFiles.length > 0 && (
            <div className="mt-1 border-t border-hairline pt-1">
              {rootFiles.map((f) => <FileRow key={f.path} f={f} indent={false} />)}
            </div>
          )}
          {shown.length === 0 && <p className="px-3 py-2 font-mono text-meta text-faint">no files match “{query}”.</p>}
        </div>
      </div>

      {/* editor pane */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#FBF9F4]">
        <div className="shrink-0 flex items-stretch border-b border-hairline bg-paper-2/60">
          <div className="flex-1 flex items-stretch overflow-x-auto">
            {openTabs.map((p) => {
              const tf = files.find((x) => x.path === p);
              if (!tf) return null;
              const ac = p === path;
              return (
                <div
                  key={p}
                  onClick={() => setPath(p)}
                  className={`group flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 border-r border-hairline cursor-pointer font-mono text-meta whitespace-nowrap ${ac ? "bg-[#FBF9F4] text-ink shadow-[inset_0_-2px_0_var(--color-clay)]" : "text-muted hover:text-ink"}`}
                  title={tf.path}
                >
                  <FileIcon name={tf.name} lang={tf.lang} />
                  <span>{tf.name}</span>
                  <button onClick={(e) => closeTab(e, p)} className={`ml-0.5 text-ui leading-none text-faint hover:text-clay ${ac ? "" : "opacity-0 group-hover:opacity-100"}`} aria-label={`close ${tf.name}`}>×</button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 px-3 shrink-0 border-l border-hairline">
            {validator && <span className={`font-mono text-meta uppercase tracking-[0.1em] ${ok ? "text-[#3B6D11]" : "text-clay"}`}>{ok ? "✓ validated" : "! blocked"}</span>}
            <button onClick={download} title="download the whole runnable repo as a .zip" className="font-mono text-meta uppercase tracking-[0.06em] text-ink-2 hover:text-ink border border-hairline-2 hover:border-ink rounded px-2 py-1 transition-colors">⬇ project.zip</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {file && <CodeBlock code={file.code} highlightName={highlight} flush />}
        </div>

        <div className="shrink-0 flex items-center gap-3 px-4 py-1.5 border-t border-hairline bg-paper-2/60 font-mono text-meta text-muted">
          {pinChips.length > 0 ? pinChips.map((p, i) => <span key={i} className="text-clay-deep">🔒 {p}</span>) : <span className="text-faint">{file?.path}</span>}
          <span className="text-faint">·</span>
          <span>python 3.11</span>
          <span className="ml-auto text-faint">git clone → pip install -e . → python -m invariant_research.pipeline</span>
        </div>
      </div>
    </div>
  );
}
