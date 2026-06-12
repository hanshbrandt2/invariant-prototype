"use client";

import type { SessionTree, SessionNode } from "@/lib/types";
import { pinnedNodes, pathTo } from "@/lib/session-tree";
import { StarIcon, XIcon } from "@/components/workspace/icons";

/**
 * The pinboard — the curated deliverable (ADR-0001 · D5). Two planes: the
 * exploration tree is free and unbounded; the pinboard is the report assembling
 * itself — only PINNED nodes become "the answer", in narrative (tree) order. A
 * pin is orthogonal to a published finding: publish seals a read-only citable
 * artifact; a pin bookmarks an explorable session state. Clicking a pin travels
 * the canvas there; pins persist with the session.
 */
export function Pinboard({
  tree,
  onTravel,
  onUnpin,
}: {
  tree: SessionTree | null;
  onTravel: (nodeId: string) => void;
  onUnpin: (nodeId: string) => void;
}) {
  const pins: SessionNode[] = tree ? pinnedNodes(tree) : [];
  // a pin's place in the trunk — "node N" — gives the memo its order
  const orderOf = (id: string) => (tree ? pathTo(tree, id).filter((n) => !n.view.dive).length : 0);
  return (
    <aside className="hidden lg:flex w-[268px] shrink-0 flex-col border-l border-hairline px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p className="eyebrow">pinboard · the deliverable</p>
        <span className="font-mono text-micro text-faint tabular-nums">{pins.length} pin{pins.length === 1 ? "" : "s"}</span>
      </div>
      {pins.length === 0 ? (
        <p className="text-ui text-faint leading-snug max-w-[32ch]">
          Hit <span className="text-clay font-medium">pin&nbsp;★</span> on the finding (above the chart) or any node in the session map to start the memo. Exploration is free; only pins become the answer.
        </p>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-1.5 -mx-1 px-1">
            {pins.map((p) => (
              <div key={p.id} className="group border border-hairline bg-paper px-2.5 py-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-clay shrink-0 mt-0.5"><StarIcon filled className="h-3 w-3" /></span>
                  <button onClick={() => onTravel(p.id)} className="min-w-0 flex-1 text-left">
                    <div className="text-ui text-ink leading-tight line-clamp-2">{p.annotation || p.delta}</div>
                    <div className="mt-0.5 font-mono text-micro text-faint">
                      {p.view.dive ? `${p.view.dive.space} trace` : `node ${orderOf(p.id)}`}{p.actor === "agent" ? " · agent" : ""}
                    </div>
                  </button>
                  <button
                    onClick={() => onUnpin(p.id)}
                    title="unpin"
                    className="shrink-0 inline-flex text-faint opacity-0 group-hover:opacity-100 hover:text-clay transition-opacity mt-0.5"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-micro text-faint leading-snug">{pins.length} pin{pins.length === 1 ? "" : "s"} · the memo, assembling itself.</p>
        </>
      )}
    </aside>
  );
}
