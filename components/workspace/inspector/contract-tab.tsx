"use client";

import { useState } from "react";
import type { Node } from "@/lib/types";

/** Format an ISO timestamp as "2024-06-28 · 17:45 UTC" by slicing — no Date
 *  parsing, so it's deterministic and timezone-stable. */
function fmtTs(iso?: string): string | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (m) return `${m[1]} · ${m[2]} UTC`;
  return iso.slice(0, 10);
}

/** A copyable hash chip — click to copy the full value to the clipboard. */
function HashChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button
      onClick={copy}
      title="click to copy"
      className="group flex items-center justify-between gap-3 w-full px-4 py-2.5 hover:bg-paper-2/60 transition-colors text-left"
    >
      <span className="font-mono text-meta uppercase tracking-[0.1em] text-muted shrink-0">{label}</span>
      <span className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-ui text-ink truncate">{value}</span>
        <span className={`font-mono text-meta shrink-0 ${copied ? "text-[#3B6D11]" : "text-faint group-hover:text-clay"}`}>
          {copied ? "copied ✓" : "copy"}
        </span>
      </span>
    </button>
  );
}

/** A plain key/value provenance row. */
function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5 font-mono text-ui">
      <span className="text-muted shrink-0">{k}</span>
      <span className={`text-right break-all ${accent ? "text-clay" : "text-ink"}`}>{v}</span>
    </div>
  );
}

/**
 * The Contract tab — the artifact's provenance card. Identity, ownership, and
 * the content/lineage/code hashes that make it reproducible. Reads only real
 * Node contract fields; anything unset is simply omitted (no fabrication).
 */
export function ContractTab({ node }: { node: Node }) {
  const hashes: [string, string][] = [
    ...(node.contentHash ? [["content hash", node.contentHash] as [string, string]] : []),
    ...(node.lineageHash ? [["lineage hash", node.lineageHash] as [string, string]] : []),
    ...(node.producerCodeHash ? [["producer code", node.producerCodeHash] as [string, string]] : []),
  ];

  const ident: [string, string, boolean?][] = [
    ["id", node.id],
    ["kind", node.kind],
    ["version", node.version ?? "—"],
    ["state", node.state ?? "—", node.state === "live"],
    ["source", node.source],
  ];

  const prov: [string, string][] = [
    ...(node.owner ? [["owner", node.owner] as [string, string]] : []),
    ...(fmtTs(node.createdAt) ? [["created", fmtTs(node.createdAt)!] as [string, string]] : []),
    ...(fmtTs(node.asOfKnowledgeTime) ? [["knowledge time", fmtTs(node.asOfKnowledgeTime)!] as [string, string]] : []),
    ...(node.pitConstruction ? [["construction", node.pitConstruction.replace(/_/g, "-")] as [string, string]] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <section>
        <p className="eyebrow mb-2">identity</p>
        <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">
          {ident.map(([k, v, accent]) => (
            <Row key={k} k={k} v={v} accent={accent} />
          ))}
        </div>
      </section>

      {prov.length > 0 && (
        <section>
          <p className="eyebrow mb-2">provenance</p>
          <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">
            {prov.map(([k, v]) => (
              <Row key={k} k={k} v={v} />
            ))}
          </div>
        </section>
      )}

      {hashes.length > 0 && (
        <section>
          <p className="eyebrow mb-2">hashes · click to copy</p>
          <div className="rounded-lg border border-hairline bg-white divide-y divide-hairline overflow-hidden">
            {hashes.map(([k, v]) => (
              <HashChip key={k} label={k} value={v} />
            ))}
          </div>
          <p className="mt-2 font-mono text-meta text-faint">
            content + lineage hashes pin this artifact; re-running the same recipe on the same inputs reproduces them.
          </p>
        </section>
      )}

      {node.policyRefs && node.policyRefs.length > 0 && (
        <section>
          <p className="eyebrow mb-2">governed by</p>
          <div className="flex flex-wrap gap-1.5">
            {node.policyRefs.map((p) => (
              <span key={p} className="font-mono text-meta border border-clay text-clay rounded-full px-2.5 py-1">
                {p.split(":")[1] ?? p}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
