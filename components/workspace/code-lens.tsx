"use client";

import { useState } from "react";

/**
 * The Code lens: the full, reproducible Python — copy-paste it, bring data in
 * the input shape, run it, get the same result. It opens with the input-schema
 * contract and never references internal storage layers. When inspecting one
 * node, `highlightName` lights that node's block inside the whole script.
 */
export function CodeLens({ code, name, highlightName }: { code: string; name: string; highlightName?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };
  const download = () => {
    const blob = new Blob([code], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "analysis").replace(/[^\w.-]+/g, "_").toLowerCase()}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="eyebrow">reproducible{highlightName ? ` · ${highlightName}` : ""}</p>
        <div className="flex items-center gap-1.5">
          <button onClick={copy} className="font-mono text-meta uppercase tracking-[0.1em] rounded-md border border-hairline-2 px-2.5 py-1 text-muted hover:border-ink hover:text-ink transition-colors">
            {copied ? "copied ✓" : "copy"}
          </button>
          <button onClick={download} className="font-mono text-meta uppercase tracking-[0.1em] rounded-md border border-hairline-2 px-2.5 py-1 text-muted hover:border-ink hover:text-ink transition-colors">
            download .py
          </button>
        </div>
      </div>
      <CodeBlock code={code} highlightName={highlightName} />
    </div>
  );
}

/* ── syntax theme (restrained, editorial — low-chroma, on warm paper) ──────── */
type Cls = "default" | "comment" | "string" | "number" | "keyword" | "fn" | "type" | "builtin" | "decorator" | "op" | "punct";
const COLOR: Record<Cls, string> = {
  default: "#3a3833",
  comment: "#A89F8C",
  string: "#5f7330",
  number: "#9a6a2f",
  keyword: "#B0432A",
  fn: "#3a5a78",
  type: "#2f6d62",
  builtin: "#8a6d3a",
  decorator: "#8a6d3a",
  op: "#8a8478",
  punct: "#9a948a",
};
const KEYWORDS = new Set(["def", "return", "import", "from", "if", "elif", "else", "for", "while", "in", "as", "with", "class", "lambda", "None", "True", "False", "and", "or", "not", "is", "try", "except", "finally", "raise", "yield", "assert", "pass", "break", "continue", "global", "nonlocal", "del", "async", "await"]);
const BUILTINS = new Set(["print", "len", "range", "list", "dict", "set", "tuple", "int", "float", "str", "bool", "abs", "min", "max", "sum", "round", "sorted", "enumerate", "zip", "map", "filter", "open", "load"]);

interface Tok { text: string; cls: Cls }

/** Line-by-line Python tokeniser with cross-line triple-string state. Good enough
 *  for display: strings, comments, numbers, keywords, builtins, calls, types. */
function tokenize(code: string): Tok[][] {
  const out: Tok[][] = [];
  let inTriple: string | null = null;
  for (const line of code.split("\n")) {
    const toks: Tok[] = [];
    let i = 0;
    if (inTriple) {
      const close = line.indexOf(inTriple);
      if (close === -1) { out.push([{ text: line || " ", cls: "string" }]); continue; }
      toks.push({ text: line.slice(0, close + 3), cls: "string" });
      i = close + 3;
      inTriple = null;
    }
    while (i < line.length) {
      const rest = line.slice(i);
      const tq = rest.match(/^("""|''')/);
      if (tq) {
        const delim = tq[1];
        const closeRel = rest.slice(3).indexOf(delim);
        if (closeRel === -1) { toks.push({ text: rest, cls: "string" }); inTriple = delim; break; }
        const end = 3 + closeRel + 3;
        toks.push({ text: rest.slice(0, end), cls: "string" }); i += end; continue;
      }
      if (rest[0] === "#") { toks.push({ text: rest, cls: "comment" }); break; }
      const str = rest.match(/^[rbf]?(["'])(?:\\.|(?!\1).)*\1/);
      if (str) { toks.push({ text: str[0], cls: "string" }); i += str[0].length; continue; }
      const num = rest.match(/^\d[\d_.]*(?:[eE][+-]?\d+)?/);
      if (num) { toks.push({ text: num[0], cls: "number" }); i += num[0].length; continue; }
      const dec = rest.match(/^@\w+/);
      if (dec) { toks.push({ text: dec[0], cls: "decorator" }); i += dec[0].length; continue; }
      const id = rest.match(/^[A-Za-z_]\w*/);
      if (id) {
        const w = id[0];
        const isCall = /^\s*\(/.test(rest.slice(w.length));
        let cls: Cls = "default";
        if (KEYWORDS.has(w)) cls = "keyword";
        else if (isCall) cls = "fn";
        else if (/^[A-Z]/.test(w)) cls = "type";
        else if (BUILTINS.has(w)) cls = "builtin";
        toks.push({ text: w, cls }); i += w.length; continue;
      }
      const ws = rest.match(/^\s+/);
      if (ws) { toks.push({ text: ws[0], cls: "default" }); i += ws[0].length; continue; }
      const op = rest.match(/^[=+\-*/%<>!&|^~]+/);
      if (op) { toks.push({ text: op[0], cls: "op" }); i += op[0].length; continue; }
      toks.push({ text: rest[0], cls: "punct" }); i += 1;
    }
    out.push(toks.length ? toks : [{ text: " ", cls: "default" }]);
  }
  return out;
}

/** The dark, line-numbered, multi-colour code block — reused by the Code view.
 *  `flush` fills its container edge-to-edge (the dark Code-lens pane) instead of
 *  being a rounded card (the inspector's Code tab). */
export function CodeBlock({ code, highlightName, flush }: { code: string; highlightName?: string; flush?: boolean }) {
  const lines = code.split("\n");
  const tokens = tokenize(code);
  const isHi = (line: string) => {
    if (!highlightName) return false;
    const t = line.trimStart();
    return t.startsWith(`def ${highlightName}(`) || t.startsWith(`${highlightName} =`) || t.startsWith(`${highlightName}  #`) || t === highlightName;
  };
  return (
    <div className={flush ? "bg-[#FBF9F4] min-h-full" : "rounded-lg border border-hairline bg-[#FBF9F4] overflow-hidden"}>
      <pre className="py-2.5 text-meta leading-[1.6] font-mono">
        {lines.map((line, i) => (
          <div key={i} className={`flex items-start ${isHi(line) ? "bg-clay-wash" : ""}`}>
            <span className="select-none shrink-0 w-10 pr-3 text-right text-meta text-[#B5AFA2] tabular-nums">{line.trim() ? i + 1 : ""}</span>
            <code className="flex-1 pr-5 whitespace-pre-wrap break-words">
              {tokens[i].map((t, j) => (
                <span key={j} style={{ color: COLOR[t.cls], fontStyle: t.cls === "comment" ? "italic" : undefined }}>{t.text}</span>
              ))}
            </code>
          </div>
        ))}
      </pre>
    </div>
  );
}
