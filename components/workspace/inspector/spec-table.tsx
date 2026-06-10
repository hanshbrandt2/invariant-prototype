"use client";

import { useState } from "react";

/**
 * Renders a node's typed `spec` — the recipe, read from the contract, not
 * invented prose. Two views: a dict-table (default) and the raw YAML ("view
 * recipe"). Scalars inline, arrays as chips, one level of nesting indented.
 */
export function SpecTable({ spec }: { spec: unknown }) {
  const [yaml, setYaml] = useState(false);
  if (!spec || typeof spec !== "object") {
    return <div className="p-6 text-body text-muted">No spec recorded for this artifact.</div>;
  }
  const obj = spec as Record<string, unknown>;
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">spec · the recipe</p>
        <button
          onClick={() => setYaml((y) => !y)}
          className="font-mono text-meta uppercase tracking-[0.1em] rounded-md border border-hairline-2 px-2.5 py-1 text-muted hover:border-ink hover:text-ink transition-colors"
        >
          {yaml ? "table" : "view recipe (yaml)"}
        </button>
      </div>
      {yaml ? (
        <pre className="rounded-lg border border-ink bg-ink text-paper/90 p-4 font-mono text-ui leading-[1.7] overflow-x-auto whitespace-pre-wrap break-words">
          {toYaml(obj, 0)}
        </pre>
      ) : (
        <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">
          {Object.entries(obj).map(([k, v]) => (
            <Row key={k} k={k} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: unknown }) {
  if (Array.isArray(v)) {
    return (
      <div className="px-4 py-2.5">
        <div className="font-mono text-meta uppercase tracking-[0.1em] text-muted mb-1.5">{k}</div>
        <div className="flex flex-wrap gap-1.5">
          {v.map((x, i) => (
            <span key={i} className="font-mono text-meta text-ink-2 bg-paper-2 rounded-full px-2 py-0.5">{String(x)}</span>
          ))}
        </div>
      </div>
    );
  }
  if (v && typeof v === "object") {
    return (
      <div className="px-4 py-2.5">
        <div className="font-mono text-meta uppercase tracking-[0.1em] text-muted mb-1">{k}</div>
        <div className="ml-2 border-l border-hairline pl-3 divide-y divide-hairline/60">
          {Object.entries(v as Record<string, unknown>).map(([kk, vv]) => (
            <div key={kk} className="flex items-baseline justify-between gap-4 py-1.5 font-mono text-ui">
              <span className="text-muted">{kk}</span>
              <span className="text-clay tabular-nums text-right break-all">{String(vv)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  // long prose (e.g. intendedInvariant) reads better stacked under its key,
  // left-aligned, than crammed right-aligned against the gutter.
  const str = typeof v === "string" ? v : String(v);
  if (typeof v === "string" && v.length > 48) {
    return (
      <div className="px-4 py-2.5">
        <div className="font-mono text-meta uppercase tracking-[0.1em] text-muted mb-1.5">{k}</div>
        <p className="text-ui leading-[1.6] text-ink-2 max-w-[52ch]">{str}</p>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5 font-mono text-ui">
      <span className="text-muted shrink-0">{k}</span>
      <span className="text-ink text-right break-words">{str}</span>
    </div>
  );
}

/** Tiny dependency-free YAML stringifier for the spec dicts. */
function toYaml(v: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return v.map((x) => `${pad}- ${typeof x === "object" && x ? "\n" + toYaml(x, indent + 1) : fmtScalar(x)}`).join("\n");
  }
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        if (val && typeof val === "object") return `${pad}${k}:\n${toYaml(val, indent + 1)}`;
        return `${pad}${k}: ${fmtScalar(val)}`;
      })
      .join("\n");
  }
  return `${pad}${fmtScalar(v)}`;
}

function fmtScalar(v: unknown): string {
  if (typeof v === "string") return v;
  return String(v);
}
