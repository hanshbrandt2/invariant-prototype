"use client";

import type { SessionTree, SessionNode } from "@/lib/types";
import { pathTo, childrenOf, questionAncestor, diveDepthUnder } from "@/lib/session-tree";
import { StarIcon, BranchIcon, ChevronIcon } from "@/components/workspace/icons";

/**
 * The session map — the workspace's meta-chrome, where the contract rail used to
 * sit (ADR-0001 · D8). It reads the live SessionTree and makes the session
 * legible: the trunk of questions you're on, the branches you forked off (never
 * lost), how deep each answer was traced, and where you are. Clicking a node
 * TRAVELS the canvas there (the viewport morphs — it doesn't teleport).
 *
 * Questions are the trunk; dives hang beneath a question and show as a depth
 * badge rather than their own cards (a node is one coherent answer — ADR D9).
 */
export function SessionMap({ tree, onTravel, onPin, onUnpin }: { tree: SessionTree | null; onTravel: (nodeId: string) => void; onPin?: (nodeId: string, annotation?: string) => void; onUnpin?: (nodeId: string) => void }) {
  if (!tree) {
    return (
      <div className="min-w-0 flex-1 px-4 py-2.5 overflow-hidden">
        <p className="eyebrow mb-2">the session · a tree, not a stack</p>
        <p className="text-ui text-faint">ask a question to start the trunk — each one becomes a node you can return to or fork.</p>
      </div>
    );
  }

  // the line of questions you're currently on (root → the question you're in)
  const curQ = questionAncestor(tree, tree.currentId);
  const qPath: SessionNode[] = pathTo(tree, curQ).filter((n) => !n.view.dive);
  const qChildren = (id: string) => childrenOf(tree, id).filter((n) => !n.view.dive);
  const total = Object.values(tree.nodes).filter((n) => !n.view.dive).length;

  return (
    <div className="min-w-0 flex-1 px-4 py-2.5 overflow-hidden">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="eyebrow">the session · a tree, not a stack</p>
        <p className="font-mono text-micro text-faint">
          {total} question{total === 1 ? "" : "s"} · <span className="text-muted">j/k</span> to move · <span className="text-muted">?</span> for keys
        </p>
      </div>
      <div className="flex items-stretch overflow-x-auto pb-1">
        {qPath.map((q, i) => {
          const onNode = q.id === curQ;
          const depth = diveDepthUnder(tree, q.id);
          // sibling question-branches at this point (parent has >1 question child)
          const siblings = q.parentId ? qChildren(q.parentId) : [];
          const forked = siblings.length > 1;
          return (
            <div key={q.id} className="flex items-center shrink-0">
              <div className="shrink-0">
                <button
                  onClick={() => onTravel(q.id)}
                  className={`block w-[164px] text-left border bg-paper px-2.5 py-1.5 transition-colors ${onNode ? "border-clay ring-1 ring-clay/30" : "border-hairline hover:border-ink"}`}
                >
                  <div className={`flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.12em] ${onNode ? "text-clay" : "text-faint"}`}>
                    <span>{onNode ? "you are here" : `node ${i + 1}`}</span>
                    {q.actor === "agent" && <span className="text-faint normal-case tracking-normal">· agent</span>}
                    {onPin && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); q.pinned && onUnpin ? onUnpin(q.id) : onPin(q.id, q.delta); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); q.pinned && onUnpin ? onUnpin(q.id) : onPin(q.id, q.delta); } }}
                        title={q.pinned ? "pinned to the deliverable — click to unpin" : "pin to the deliverable"}
                        className={`ml-auto inline-flex cursor-pointer ${q.pinned ? "text-clay" : "text-faint hover:text-clay"} transition-colors`}
                      >
                        <StarIcon filled={q.pinned} className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-ui text-ink leading-tight line-clamp-2">{q.delta}</div>
                  {depth > 0 && <div className="mt-0.5 font-mono text-micro text-faint">↓ traced {depth} level{depth === 1 ? "" : "s"} to raw</div>}
                </button>
                {forked && (
                  <div className="mt-1 flex items-center gap-1 flex-wrap">
                    <BranchIcon className="h-3 w-3 text-faint" />
                    {siblings.filter((s) => s.id !== q.id).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => onTravel(s.id)}
                        title={s.delta}
                        className="font-mono text-micro text-muted border border-dashed border-hairline-2 px-1.5 py-0.5 hover:border-ink hover:text-ink transition-colors max-w-[120px] truncate"
                      >
                        {s.delta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {i < qPath.length - 1 && <div className="px-1.5 shrink-0 self-center text-hairline-2"><ChevronIcon className="h-3.5 w-3.5" /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
