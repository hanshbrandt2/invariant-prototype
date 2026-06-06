"use client";

import Link from "next/link";
import { useCredits } from "@/components/app/credits-context";
import { ExportMenu } from "@/components/workspace/export-menu";
import type { Lens } from "@/components/workspace/types";

const LENSES: { id: Lens; label: string }[] = [
  { id: "graph", label: "Graph" },
  { id: "result", label: "Result" },
  { id: "code", label: "Code" },
  { id: "concepts", label: "Concepts" },
];

/**
 * The workspace top bar: name + the lens switcher as a clear segmented control
 * (Graph first), the credit balance, and the chat toggle. The canvas below is
 * the hero.
 */
export function WorkspaceTopBar({
  workspaceName,
  live,
  lens,
  onLens,
  focusLabel,
  canBack,
  onBack,
  chatOpen,
  onToggleChat,
  getScript,
  getConversation,
}: {
  workspaceName: string;
  live: boolean;
  lens: Lens;
  onLens: (l: Lens) => void;
  focusLabel?: string;
  canBack: boolean;
  onBack: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  getScript: () => string;
  getConversation: () => string;
}) {
  const { balance } = useCredits();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 pl-2 pr-5">
      <div className="flex items-center gap-4 min-w-0">
        {!chatOpen && (
          <button onClick={onToggleChat} title="show chat" className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-paper hover:text-ink hover:shadow-soft transition-all">
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4.5" width="14" height="11" rx="2.5" /><path d="M7.5 4.5v11" />
            </svg>
          </button>
        )}
        <div className="flex items-baseline gap-2 min-w-0">
          <Link href="/dashboard" className="text-[0.78rem] text-faint hover:text-clay transition-colors">Dashboard</Link>
          <span className="text-faint">/</span>
          <span className="font-mono text-[0.92rem] text-ink truncate">{workspaceName}</span>
          {canBack && focusLabel && (
            <>
              <span className="text-faint">/</span>
              <button onClick={onBack} className="text-[0.82rem] text-clay hover:underline truncate" title="back">{focusLabel} ✕</button>
            </>
          )}
        </div>

        {live && (
          <div className="inline-flex rounded-xl bg-paper p-[3px] shadow-soft">
            {LENSES.map((l) => (
              <button
                key={l.id}
                onClick={() => onLens(l.id)}
                className={`rounded-[9px] px-3.5 py-1.5 text-[0.82rem] transition-colors ${
                  lens === l.id ? "bg-ink text-paper" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {live && <ExportMenu workspaceName={workspaceName} getScript={getScript} getConversation={getConversation} />}
        <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 shadow-soft" title="credit balance — ticks down as you build">
          <span className="eyebrow">credits</span>
          <span className={`font-mono text-[0.85rem] tabular-nums transition-colors ${balance < 10 ? "text-clay" : "text-ink"}`}>{balance.toFixed(1)}</span>
        </div>
      </div>
    </header>
  );
}
