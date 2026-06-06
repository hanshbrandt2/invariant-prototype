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
  const lines = code.split("\n");

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

  const isHi = (line: string) =>
    !!highlightName && (line.trimStart().startsWith(`${highlightName} =`) || line.trimStart().startsWith(`${highlightName}  #`) || line.trimStart() === highlightName);

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="eyebrow">reproducible{highlightName ? ` · ${highlightName}` : ""}</p>
        <div className="flex items-center gap-1.5">
          <button onClick={copy} className="font-mono text-[0.66rem] uppercase tracking-[0.1em] rounded-md border border-hairline-2 px-2.5 py-1 text-muted hover:border-ink hover:text-ink transition-colors">
            {copied ? "copied ✓" : "copy"}
          </button>
          <button onClick={download} className="font-mono text-[0.66rem] uppercase tracking-[0.1em] rounded-md border border-hairline-2 px-2.5 py-1 text-muted hover:border-ink hover:text-ink transition-colors">
            download .py
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-ink bg-ink overflow-hidden">
        <pre className="py-3 text-[0.8rem] leading-[1.7] font-mono">
          {lines.map((line, i) => (
            <div key={i} className={`flex items-start ${isHi(line) ? "bg-clay/25" : ""}`}>
              <span className="select-none shrink-0 w-9 pr-3 text-right text-[#56534a]">{line.trim() ? i + 1 : ""}</span>
              <code className="flex-1 pr-5 whitespace-pre-wrap break-words text-paper/90">
                <Tokens line={line} />
              </code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

const COMMENT = "#6f6a5e";
const STRING = "#d9b36b";
const KEYWORD = "#e08a63";
const FN = "#7fa6c9";

/** Bug-free, regex-split tokeniser: strings, then keywords + call names. */
function Tokens({ line }: { line: string }) {
  if (line.trim().startsWith("#")) return <span style={{ color: COMMENT }}>{line || " "}</span>;
  const hi = line.indexOf("#");
  const codePart = hi >= 0 ? line.slice(0, hi) : line;
  const comment = hi >= 0 ? line.slice(hi) : "";
  const parts = codePart.split(/("[^"]*")/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('"') && p.endsWith('"') ? (
          <span key={i} style={{ color: STRING }}>{p}</span>
        ) : (
          <Words key={i} text={p} />
        )
      )}
      {comment && <span style={{ color: COMMENT }}>{comment}</span>}
    </>
  );
}

function Words({ text }: { text: string }) {
  // keep delimiters: `from`, `import`, and any word immediately before "("
  const segs = text.split(/(\bfrom\b|\bimport\b|\b\w+(?=\())/);
  return (
    <>
      {segs.map((s, i) => {
        if (s === "from" || s === "import") return <span key={i} style={{ color: KEYWORD }}>{s}</span>;
        if (/^\w+$/.test(s) && segs[i + 1]?.startsWith("(")) return <span key={i} style={{ color: FN }}>{s}</span>;
        return <span key={i}>{s}</span>;
      })}
    </>
  );
}
