"use client";

import Link from "next/link";
import { useCredits } from "@/components/app/credits-context";
import { ExportMenu } from "@/components/workspace/export-menu";
import { CogIcon, ShareIcon, CheckIcon } from "@/components/workspace/icons";
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
  auditOpen,
  onToggleAudit,
  sealOk,
  inForce,
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
  auditOpen?: boolean;
  onToggleAudit?: () => void;
  sealOk?: boolean;
  inForce?: number;
}) {
  const { balance } = useCredits();
  // the iteration bound is credits, not a timer (ADR-0001 · D6): surface how many
  // more questions the balance buys, at a rough avg cost per question.
  const low = balance < 10;
  const questionsLeft = Math.max(0, Math.floor(balance / 1.5));

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-4">
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
              title="the insight — the finding as a visual story"
              className={`px-3 py-1 transition-colors ${lens === "result" ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              insight
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
            className="btn-press inline-flex items-center gap-1.5 font-mono text-meta uppercase tracking-[0.1em] border border-clay text-clay px-3 py-1.5 hover:bg-clay hover:text-paper"
          >
            promote <CogIcon className="h-[13px] w-[13px]" />
          </button>
        )}
        {canPublish && onPublish && (
          <button
            onClick={onPublish}
            title="pin this finding as a read-only, citable artifact — sealed & shareable"
            className={`btn-press inline-flex items-center gap-1.5 font-mono text-meta uppercase tracking-[0.1em] border px-3 py-1.5 ${published ? "border-[#3B6D11] text-[#3B6D11] hover:bg-[#3B6D11] hover:text-paper" : "border-ink text-ink hover:bg-ink hover:text-paper"}`}
          >
            {published ? <>published <CheckIcon className="h-[13px] w-[13px]" /></> : <>publish <ShareIcon className="h-[13px] w-[13px]" /></>}
          </button>
        )}
        {live && onToggleAudit && (
          <button
            onClick={onToggleAudit}
            title="audit · the contract and lineage underneath this canvas — the engine that lets a figure be trusted"
            className={`btn-press flex items-center gap-1.5 font-mono text-meta uppercase tracking-[0.1em] border px-2.5 py-1.5 ${auditOpen ? "border-ink text-ink bg-paper" : "border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
          >
            <span className={`h-2 w-2 rounded-full ${sealOk === false ? "bg-clay" : "bg-green ring-2 ring-green/20"}`} />
            audit
            {typeof inForce === "number" && <span className="text-faint normal-case tracking-normal">· {inForce}</span>}
          </button>
        )}
        {live && <ExportMenu workspaceName={workspaceName} getScript={getScript} getConversation={getConversation} getProject={getProject} />}
        <div className="flex items-center gap-2 border border-hairline-2 bg-paper px-3 py-1.5" title="iteration budget — credits remaining ≈ the questions you can still ask (the bound is compute, not a timer)">
          <span className="eyebrow">budget</span>
          <span className={`font-mono text-ui tabular-nums transition-colors ${low ? "text-clay" : "text-ink"}`}>{balance.toFixed(0)} cr</span>
          <span className="font-mono text-meta text-faint">· ~{questionsLeft} q</span>
        </div>
      </div>
    </header>
  );
}
