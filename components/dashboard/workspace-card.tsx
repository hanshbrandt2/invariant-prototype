import Link from "next/link";
import type { Workspace } from "@/lib/types";
import { ResearchGraph } from "@/components/landing/research-graph";

/** A workspace = a research thread. The preview IS its lineage (provenance at a glance). */
export function WorkspaceCard({ ws }: { ws: Workspace }) {
  return (
    <Link
      href={`/workspace/${ws.id}`}
      className="group block border border-hairline bg-paper hover:border-ink transition-colors"
    >
      <div className="border-b border-hairline bg-paper-2 px-4 py-5 h-[132px] flex items-center justify-center overflow-hidden">
        <ResearchGraph subgraph={ws.lineage} variant="thumb" className="max-h-[92px]" />
      </div>
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[0.86rem] text-ink truncate">{ws.name}</span>
          <span className="font-mono text-[0.66rem] text-faint shrink-0">{ws.updatedAt}</span>
        </div>
        <p className="mt-1.5 text-[0.82rem] leading-snug text-muted line-clamp-2">{ws.summary}</p>
      </div>
    </Link>
  );
}
