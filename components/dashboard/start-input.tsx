"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { StarterPrompt } from "@/lib/types";

/**
 * Dashboard hero input. Prefilled with a rotating (date-seeded) starter prompt
 * that is trivially clearable — it must never fight a user who wants to type.
 * Typing + run, or clicking an example, drops into a fresh workspace.
 */
export function StartInput({
  initial,
  examples,
}: {
  initial: string;
  examples: StarterPrompt[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // the field hugs its content (no dead box under a one-line prompt) and grows.
  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };
  useEffect(autosize, []);

  const start = (prompt: string) => {
    const p = prompt.trim();
    if (!p) return;
    router.push(`/workspace/new?build=${encodeURIComponent(p)}`);
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(value);
        }}
        className="border border-ink bg-paper"
      >
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); autosize(); }}
          onFocus={(e) => {
            // first focus clears the prefilled suggestion in one go
            if (e.target.value === initial) e.target.select();
          }}
          rows={1}
          className="w-full resize-none bg-transparent px-5 py-4 text-h3 font-serif text-ink placeholder:text-faint outline-none min-h-[3.6rem] max-h-[168px] overflow-y-auto"
          placeholder="What are you researching?"
        />
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
          <button
            type="button"
            onClick={() => setValue("")}
            className="font-mono text-meta uppercase tracking-[0.12em] text-faint hover:text-clay transition-colors"
          >
            clear
          </button>
          <button
            type="submit"
            className="btn-press font-mono text-meta uppercase tracking-[0.13em] bg-ink text-paper px-4 py-2 hover:bg-clay"
          >
            Start analysis →
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex.text}
            onClick={() => start(ex.text)}
            title={`${ex.op} · ${ex.dataset}`}
            className="text-left text-ui text-ink-2 border border-hairline-2 rounded-full px-3 py-1.5 hover:border-ink hover:text-ink transition-colors"
          >
            {ex.text}
          </button>
        ))}
      </div>
    </div>
  );
}
