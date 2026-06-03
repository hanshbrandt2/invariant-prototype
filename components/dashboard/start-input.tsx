"use client";

import { useState } from "react";
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => {
            // first focus clears the prefilled suggestion in one go
            if (e.target.value === initial) e.target.select();
          }}
          rows={2}
          className="w-full resize-none bg-transparent px-5 py-4 text-[1.05rem] font-serif text-ink placeholder:text-faint outline-none"
          placeholder="What are you researching?"
        />
        <div className="flex items-center justify-between border-t border-hairline px-4 py-2.5">
          <button
            type="button"
            onClick={() => setValue("")}
            className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-faint hover:text-clay transition-colors"
          >
            clear
          </button>
          <button
            type="submit"
            className="font-mono text-[0.72rem] uppercase tracking-[0.13em] bg-ink text-paper px-4 py-2 hover:bg-clay transition-colors"
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
            className="text-left text-[0.8rem] text-ink-2 border border-hairline-2 rounded-full px-3 py-1.5 hover:border-ink hover:text-ink transition-colors"
          >
            {ex.text}
          </button>
        ))}
      </div>
    </div>
  );
}
