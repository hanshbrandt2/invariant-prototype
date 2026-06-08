"use client";

import { useEffect, useRef, useState } from "react";
import type { PlanView, Turn, NextAction, Validator } from "@/lib/types";
import { TrustBadge } from "@/components/workspace/trust-badge";

/** Always-on conversation = the build interface. What you write compiles to a
 *  build; the agent surfaces the decomposed plan here as a ticking checklist
 *  (which doubles as the meter), then it materialises on the canvas. */
export function Conversation({
  turns,
  building,
  onSubmit,
  onAction,
  onApprovePlan,
  onScopePlan,
  onCollapse,
  validatorFor,
  onFlashPin,
}: {
  turns: Turn[];
  building: boolean;
  onSubmit: (prompt: string) => void;
  onAction: (a: NextAction) => void;
  onApprovePlan: (turnId: string) => void;
  onScopePlan: (turnId: string, years: number) => void;
  onCollapse: () => void;
  validatorFor?: (nodeId: string) => Validator | undefined;
  onFlashPin?: (pinId: string) => void;
}) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, building]);

  const send = () => {
    const p = value.trim();
    if (!p) return;
    setValue("");
    onSubmit(p);
  };

  return (
    <div className="rise hidden lg:flex flex-col w-[330px] shrink-0 border-r border-hairline bg-paper">
      <div className="flex items-center justify-between h-16 px-5">
        <span className="text-[0.8rem] font-medium text-muted">Chat</span>
        <button onClick={onCollapse} title="hide chat" className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:bg-paper hover:text-ink transition-all text-[0.85rem] leading-none">‹‹</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {turns.map((t) => (
          <div key={t.id}>
            {t.role === "user" ? (
              <p className="text-[0.9rem] leading-[1.55] text-ink bg-white border border-hairline  rounded-lg rounded-tr-md px-3.5 py-2.5">{t.text}</p>
            ) : (
              <p className="text-[0.9rem] leading-[1.62] text-ink-2">{t.text}</p>
            )}

            {t.plan && <PlanChecklist plan={t.plan} onApprove={() => onApprovePlan(t.id)} onScope={(y) => onScopePlan(t.id, y)} />}

            {t.actions && t.actions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {t.actions.map((a, i) => {
                  // a returned result carries its validator inline — the chat zoom
                  // of the one TrustBadge object (red → flash the violated pin).
                  const v = a.type === "push_node" ? validatorFor?.(a.ref) : undefined;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5">
                      {v && <TrustBadge validator={v} zoom="chat" onClick={v.violatedPin ? () => onFlashPin?.(v.violatedPin!) : undefined} />}
                      <button
                        onClick={() => onAction(a)}
                        className="text-left text-[0.78rem] text-ink-2 bg-white border border-hairline  rounded-full px-3 py-1 hover:text-ink transition-colors"
                      >
                        {a.type === "push_node" ? `open ${a.ref.split(":")[1] ?? a.ref}` : a.type === "open_catalog" ? "browse hosted data" : a.label}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="p-3">
        <div className="rounded-lg border border-hairline bg-white  focus-within:border-hairline-2 transition-colors">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="describe what to build…"
            className="w-full resize-none bg-transparent px-3.5 py-2.5 text-[0.9rem] outline-none placeholder:text-faint"
          />
          <div className="flex justify-end px-2.5 pb-2.5">
            <button
              onClick={send}
              className="font-mono text-[0.68rem] uppercase tracking-[0.12em] bg-ink text-paper rounded-lg px-3.5 py-1.5 hover:bg-clay transition-colors"
            >
              build →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The plan, surfaced in chat: steps tick as they build; credits accrue; a big
 *  build waits for an explicit approve. This IS the meter. */
function PlanChecklist({ plan, onApprove, onScope }: { plan: PlanView; onApprove: () => void; onScope: (years: number) => void }) {
  const done = plan.steps.filter((s) => s.status === "done").length;
  const spent = plan.steps.filter((s) => s.status === "done").reduce((a, s) => a + s.credits, 0);
  const scopes = plan.awaitingApproval ? plan.scopeOptions ?? [] : [];
  return (
    <div className="mt-3 border border-hairline-2 bg-paper-2/50">
      {scopes.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-hairline">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-faint shrink-0">eval horizon</span>
          <div className="flex flex-wrap gap-1">
            {scopes.map((y) => (
              <button
                key={y}
                onClick={() => onScope(y)}
                className={`font-mono text-[0.64rem] rounded-full border px-2 py-0.5 transition-colors ${
                  plan.horizonYears === y ? "border-ink bg-ink text-paper" : "border-hairline-2 text-muted hover:border-ink hover:text-ink"
                }`}
              >
                {y}y
              </button>
            ))}
          </div>
        </div>
      )}
      <ol className="divide-y divide-hairline">
        {plan.steps.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 px-3 py-2">
            <span
              className={`inline-flex h-4 w-4 items-center justify-center shrink-0 rounded-full border text-[0.58rem] ${
                s.status === "done"
                  ? "bg-ink border-ink text-paper"
                  : s.status === "running"
                    ? "border-clay text-clay animate-pulse"
                    : "border-hairline-2 text-faint"
              }`}
            >
              {s.status === "done" ? "✓" : ""}
            </span>
            <span className={`flex-1 text-[0.8rem] ${s.status === "pending" ? "text-faint" : "text-ink-2"}`}>{s.label}</span>
            {s.op && <span className="font-mono text-[0.62rem] text-faint">{s.op}</span>}
            <span className="font-mono text-[0.66rem] tabular-nums text-faint w-8 text-right">{s.credits}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between px-3 py-2 border-t border-hairline">
        {plan.awaitingApproval ? (
          <>
            <span className="font-mono text-[0.66rem] text-muted">
              est. {plan.credits} credits — approve the spend
            </span>
            <button
              onClick={onApprove}
              className="font-mono text-[0.66rem] uppercase tracking-[0.12em] bg-ink text-paper px-3 py-1 hover:bg-clay transition-colors"
            >
              build →
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-[0.66rem] text-muted">
              {done}/{plan.steps.length} steps
            </span>
            <span className="font-mono text-[0.66rem] tabular-nums text-ink-2">
              {spent.toFixed(1)} <span className="text-faint">/ {plan.credits} cr</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
