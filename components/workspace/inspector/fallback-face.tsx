"use client";

import type { Node } from "@/lib/types";

/** Generic face for kinds without a bespoke one yet (feature/matrix/target/
 *  model/...). Leads with what it is, not a raw key-value dump. */
export function FallbackFace({ node, producerOp }: { node: Node; producerOp?: string }) {
  const rows: [string, string | undefined][] = [
    ["id", node.id],
    ["produced by", producerOp],
    ["source", node.source],
    ["content_hash", node.contentHash],
    ["lineage_hash", node.lineageHash],
    ["pit", node.pitConstruction],
  ];
  return (
    <div className="p-6">
      <p className="text-[0.95rem] leading-relaxed text-ink-2 max-w-[60ch]">
        {producerOp ? (
          <>
            A <span className="text-ink">{node.kind}</span> produced by{" "}
            <span className="font-mono text-clay">{producerOp}</span>. Open{" "}
            <span className="italic">how it was built</span> to walk its lineage to raw data.
          </>
        ) : (
          <>A {node.kind} artifact. Open its lineage to see how it was built.</>
        )}
      </p>
      <div className="mt-5 border border-hairline bg-paper divide-y divide-hairline">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex gap-4 px-4 py-2.5 font-mono text-[0.78rem]">
              <span className="text-faint w-32 shrink-0">{k}</span>
              <span className="text-ink-2 break-all">{v}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
