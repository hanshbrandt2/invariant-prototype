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
  mode = "continue",
  focusTick,
}: {
  turns: Turn[];
  building: boolean;
  onSubmit: (prompt: string, opts?: { fork?: boolean }) => void;
  onAction: (a: NextAction) => void;
  onApprovePlan: (turnId: string) => void;
  onScopePlan: (turnId: string, years: number) => void;
  onCollapse: () => void;
  validatorFor?: (nodeId: string) => Validator | undefined;
  onFlashPin?: (pinId: string) => void;
  mode?: "continue" | "fork"; // which intent Enter commits (set by f / c shortcuts)
  focusTick?: number; // bump to focus the composer (keyboard spine)
}) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, building]);
  // the keyboard spine focuses the composer (f / c / typing-anywhere)
  useEffect(() => { if (focusTick) taRef.current?.focus(); }, [focusTick]);

  // the input grows with what you type (line by line) instead of scrolling inside
  // a fixed box — so the chat bar feels smooth, not jumpy. Capped, then it scrolls.
  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };

  // continue ↳ grows the current line; fork ⑂ branches an alternative — the
  // abandoned line is never lost (ADR D1). Default (Enter / build) = continue.
  const send = (fork = false) => {
    const p = value.trim();
    if (!p) return;
    setValue("");
    requestAnimationFrame(autosize); // shrink the bar back after it clears
    onSubmit(p, fork ? { fork: true } : undefined);
    // mobile: the chat is a full-screen overlay — close it on send so the canvas
    // and the streaming build are revealed (on lg it stays the inline panel).
    if (typeof window !== "undefined" && window.innerWidth < 1024) onCollapse();
  };

  return (
    <div className="rise flex flex-col bg-paper-2 fixed inset-0 z-50 w-full lg:static lg:z-auto lg:w-[336px] lg:shrink-0 lg:border-r lg:border-hairline">
      <div className="flex items-center justify-between h-16 px-5">
        <span className="text-ui font-medium text-muted">Chat</span>
        <button onClick={onCollapse} title="hide chat" className="grid h-7 w-7 place-items-center rounded-lg text-faint hover:bg-paper hover:text-ink transition-all text-ui leading-none">‹‹</button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scroll-smooth px-5 pb-4 space-y-5">
        {turns.map((t) => (
          <div key={t.id}>
            {t.role === "user" ? (
              <p className="text-ui leading-[1.55] text-ink bg-white border border-hairline rounded-lg rounded-tr-md px-3.5 py-2.5">{t.text}</p>
            ) : (
              <p className="text-ui leading-[1.6] text-ink-2">{t.text}</p>
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
                        className="text-left text-ui text-ink-2 bg-white border border-hairline  rounded-full px-3 py-1 hover:text-ink transition-colors"
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
        <div ref={endRef} className="scroll-mt-4 h-px" />
      </div>

      <div className="p-3">
        <div className="rounded-lg border border-hairline bg-white transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-clay/40 focus-within:ring-1 focus-within:ring-clay/15">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); autosize(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(mode === "fork");
              }
            }}
            rows={1}
            placeholder={mode === "fork" ? "fork: ask a separate question…" : "ask the next question…"}
            className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1.5 text-ui leading-relaxed outline-none placeholder:text-faint min-h-[2.6rem] max-h-[168px] overflow-y-auto transition-[height] duration-150 ease-out"
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
            <span className="font-mono text-micro text-faint/80 pl-1 hidden sm:block">↵ send · ⇧↵ newline</span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => send(true)}
                disabled={!value.trim()}
                title="fork ⑂ (f) — explore this separately; the current line is kept, reachable in the session map"
                className={`btn-press font-mono text-meta uppercase tracking-[0.12em] rounded-lg px-2.5 py-1.5 disabled:opacity-40 disabled:pointer-events-none ${mode === "fork" ? "bg-ink text-paper hover:bg-clay" : "border border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
              >
                fork ⑂
              </button>
              <button
                onClick={() => send(false)}
                disabled={!value.trim()}
                title="continue ↳ (c) — grow the current line of inquiry"
                className={`btn-press font-mono text-meta uppercase tracking-[0.12em] rounded-lg px-3.5 py-1.5 disabled:opacity-40 disabled:pointer-events-none ${mode === "continue" ? "bg-ink text-paper hover:bg-clay" : "border border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
              >
                continue ↳
              </button>
            </div>
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
          <span className="font-mono text-meta uppercase tracking-[0.1em] text-faint shrink-0">eval horizon</span>
          <div className="flex flex-wrap gap-1">
            {scopes.map((y) => (
              <button
                key={y}
                onClick={() => onScope(y)}
                className={`font-mono text-meta rounded-full border px-2 py-0.5 transition-colors ${
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
              className={`inline-flex h-4 w-4 items-center justify-center shrink-0 rounded-full border text-meta ${
                s.status === "done"
                  ? "bg-ink border-ink text-paper"
                  : s.status === "running"
                    ? "border-clay text-clay animate-pulse"
                    : "border-hairline-2 text-faint"
              }`}
            >
              {s.status === "done" ? "✓" : ""}
            </span>
            <span className={`flex-1 text-ui ${s.status === "pending" ? "text-faint" : "text-ink-2"}`}>{s.label}</span>
            {s.op && <span className="font-mono text-meta text-faint">{s.op}</span>}
            <span className="font-mono text-meta tabular-nums text-faint w-8 text-right">{s.credits}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between px-3 py-2 border-t border-hairline">
        {plan.awaitingApproval ? (
          <>
            <span className="font-mono text-meta text-muted">
              est. {plan.credits} credits — approve the spend
            </span>
            <button
              onClick={onApprove}
              className="font-mono text-meta uppercase tracking-[0.12em] bg-ink text-paper px-3 py-1 hover:bg-clay transition-colors"
            >
              build →
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-meta text-muted">
              {done}/{plan.steps.length} steps
            </span>
            <span className="font-mono text-meta tabular-nums text-ink-2">
              {spent.toFixed(1)} <span className="text-faint">/ {plan.credits} cr</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
