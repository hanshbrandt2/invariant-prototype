"use client";

import Link from "next/link";
import { useCredits } from "@/components/app/credits-context";
import { ExportMenu } from "@/components/workspace/export-menu";

/**
 * The workspace top bar: breadcrumb + the export menu, the credit balance, and
 * the chat toggle. There is no lens switcher — the canvas below is one surface
 * (the stage-laned graph); node detail opens in the slide-over inspector.
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
}: {
  workspaceName: string;
  live: boolean;
  chatOpen: boolean;
  onToggleChat: () => void;
  getScript: () => string;
  getConversation: () => string;
  canPromote?: boolean;
  onPromote?: () => void;
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
