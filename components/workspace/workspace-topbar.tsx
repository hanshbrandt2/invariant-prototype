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
  getProject,
  canPromote,
  onPromote,
  canPublish,
  published,
  onPublish,
  lens,
  onLens,
}: {
  workspaceName: string;
  live: boolean;
  chatOpen: boolean;
  onToggleChat: () => void;
  getScript: () => string;
  getConversation: () => string;
  getProject?: () => import("@/lib/zip").ZipEntry[];
  canPromote?: boolean;
  onPromote?: () => void;
  canPublish?: boolean;
  published?: boolean;
  onPublish?: () => void;
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
          <Link href="/dashboard" className="text-ui text-faint hover:text-clay transition-colors">Dashboard</Link>
          <span className="text-faint">/</span>
          <span className="font-mono text-body text-ink truncate">{workspaceName}</span>
        </div>

        {/* the answer leads; graph / code / concepts are "go deeper" rungs, not peers */}
        {live && lens && onLens && (
          <div className="inline-flex shrink-0 items-stretch border border-hairline-2 overflow-hidden font-mono text-meta uppercase tracking-[0.1em]">
            <button
              onClick={() => onLens("result")}
              title="the finding, in plain language"
              className={`px-3 py-1 transition-colors ${lens === "result" ? "bg-ink text-paper" : "text-ink hover:bg-paper"}`}
            >
              finding
            </button>
            <span className="w-px self-stretch bg-hairline-2" aria-hidden />
            {(["graph", "code", "concepts"] as const).map((l) => (
              <button
                key={l}
                onClick={() => onLens(l)}
                title="go deeper"
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
            className="font-mono text-meta uppercase tracking-[0.1em] border border-clay text-clay px-3 py-1.5 hover:bg-clay hover:text-paper transition-colors"
          >
            promote ⚙
          </button>
        )}
        {canPublish && onPublish && (
          <button
            onClick={onPublish}
            title="pin this finding as a read-only, citable artifact — sealed & shareable"
            className={`font-mono text-meta uppercase tracking-[0.1em] border px-3 py-1.5 transition-colors ${published ? "border-[#3B6D11] text-[#3B6D11] hover:bg-[#3B6D11] hover:text-paper" : "border-ink text-ink hover:bg-ink hover:text-paper"}`}
          >
            {published ? "published ✓" : "publish ⤴"}
          </button>
        )}
        {live && <ExportMenu workspaceName={workspaceName} getScript={getScript} getConversation={getConversation} getProject={getProject} />}
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-paper px-3 py-1.5 " title="credit balance — ticks down as you build">
          <span className="eyebrow">credits</span>
          <span className={`font-mono text-ui tabular-nums transition-colors ${balance < 10 ? "text-clay" : "text-ink"}`}>{balance.toFixed(1)}</span>
        </div>
      </div>
    </header>
  );
}
