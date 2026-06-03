"use client";

import { useEffect, useRef, useState } from "react";
import type { Turn, NextAction } from "@/lib/types";

/** Always-on conversation — the build interface. What you write compiles to a build. */
export function Conversation({
  turns,
  building,
  onSubmit,
  onAction,
}: {
  turns: Turn[];
  building: boolean;
  onSubmit: (prompt: string) => void;
  onAction: (a: NextAction) => void;
}) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, building]);

  const send = () => {
    const p = value.trim();
    if (!p) return;
    setValue("");
    onSubmit(p);
  };

  return (
    <div className="hidden md:flex flex-col w-[380px] shrink-0 border-r border-hairline bg-paper">
      <div className="px-5 py-3 border-b border-hairline">
        <span className="eyebrow">conversation</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {turns.map((t) => (
          <div key={t.id}>
            <p className="eyebrow mb-1.5">{t.role === "user" ? "you" : t.role === "assistant" ? "invariant" : ""}</p>
            <p className={`text-[0.92rem] leading-[1.6] ${t.role === "user" ? "text-ink" : "text-ink-2"}`}>
              {t.text}
            </p>
            {t.actions && t.actions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-2">
                {t.actions.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => onAction(a)}
                    className="text-left text-[0.78rem] text-ink-2 border border-hairline-2 rounded-full px-3 py-1 hover:border-ink hover:text-ink transition-colors"
                  >
                    {a.type === "push_node" ? `open ${a.ref.split(":")[1] ?? a.ref}` : a.type === "open_catalog" ? "browse hosted data" : a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {building && (
          <p className="eyebrow text-clay animate-pulse">building…</p>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-hairline p-3">
        <div className="border border-hairline-2 bg-paper-2 focus-within:border-ink transition-colors">
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
              className="font-mono text-[0.68rem] uppercase tracking-[0.12em] bg-ink text-paper px-3.5 py-1.5 hover:bg-clay transition-colors"
            >
              build →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
