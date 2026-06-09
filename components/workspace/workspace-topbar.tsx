"use client";

import Link from "next/link";
import { useCredits } from "@/components/app/credits-context";
import { ExportMenu } from "@/components/workspace/export-menu";
import type { Lens } from "@/components/workspace/types";

/**
 * The workspace top bar: breadcrumb + the lens switcher, the export menu, the
 * credit balance, and the chat toggle. The lens switcher tells the same analysis
 * four ways (Result / Graph / Code / Concepts); node detail opens in the
 * slide-over inspector over whichever lens is showing.
 */
export function WorkspaceTopBar({
  workspaceName,
  live,
  chatOpen,
  onToggleChat,
  getScript,
  getConversation,
  canPromote,
  onPromote,
  lens,
  onLens,
}: {
  workspaceName: string;
  live: boolean;
  chatOpen: boolean;
  onToggleChat: () => void;
  getScript: () => string;
  getConversation: () => string;
  canPromote?: boolean;
  onPromote?: () => void;
  lens?: Lens;
  onLens?: (l: Lens) => void;
}) {
  const { balance } = useCredits();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 pl-2 pr-5">
      <div className="flex items-center gap-4 min-w-0">
        {!chatOpen && (
          <button onClick={onToggleChat} title="show chat" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink  transition-all">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="14" height="11" rx="2.5" /><path d="M7.5 4.5v11" />
            </svg>
          </button>
        )}
        <div className="flex items-baseline gap-2 min-w-0">
          <Link href="/dashboard" className="text-[0.78rem] text-faint hover:text-clay transition-colors">Dashboard</Link>
          <span className="text-faint">/</span>
          <span className="font-mono text-[0.92rem] text-ink truncate">{workspaceName}</span>
        </div>

        {/* the four lenses: one analysis told four ways (a switcher, not stacked) */}
        {live && lens && onLens && (
          <div className="inline-flex shrink-0 border border-hairline-2 overflow-hidden font-mono text-[0.64rem] uppercase tracking-[0.1em]">
            {(["result", "graph", "code", "concepts"] as const).map((l) => (
              <button
                key={l}
                onClick={() => onLens(l)}
                className={`px-3 py-1 transition-colors ${lens === l ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {canPromote && onPromote && (
          <button
            onClick={onPromote}
            title="crystallise this validated workflow as a recipe — then make it agentic"
            className="font-mono text-[0.66rem] uppercase tracking-[0.1em] border border-clay text-clay px-3 py-1.5 hover:bg-clay hover:text-paper transition-colors"
          >
            promote ⚙
          </button>
        )}
        {live && <ExportMenu workspaceName={workspaceName} getScript={getScript} getConversation={getConversation} />}
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-1.5 " title="credit balance — ticks down as you build">
          <span className="eyebrow">credits</span>
          <span className={`font-mono text-[0.85rem] tabular-nums transition-colors ${balance < 10 ? "text-clay" : "text-ink"}`}>{balance.toFixed(1)}</span>
        </div>
      </div>
    </header>
  );
}
