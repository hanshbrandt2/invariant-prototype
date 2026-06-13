"use client";

import { useEffect } from "react";

/**
 * The keyboard spine, surfaced. A quant lives in the keyboard — the mouse is
 * optional. Press `?` anywhere in the workspace to see this; Esc closes it.
 */
const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "navigate",
    keys: [
      ["j", "next question"],
      ["k", "previous question"],
      ["u", "climb back up the trace"],
      ["⌘ K", "search everything"],
    ],
  },
  {
    title: "act",
    keys: [
      ["c  /", "continue this line"],
      ["f", "fork a new line"],
      ["p", "pin to the deliverable"],
      ["a", "open audit"],
    ],
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex min-w-[1.5rem] items-center justify-center gap-1 border border-hairline-2 bg-paper-2 px-1.5 py-0.5 font-mono text-meta text-ink rounded-sm">{children}</kbd>;
}

export function KeyboardHints({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "?") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 p-6" onClick={onClose}>
      <div role="dialog" aria-label="keyboard shortcuts" className="drawer-in w-full max-w-[460px] border border-ink bg-paper" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 py-3 border-b border-hairline">
          <div>
            <p className="eyebrow text-clay">keyboard</p>
            <p className="font-serif text-h3 text-ink">Drive it by hand.</p>
          </div>
          <button onClick={onClose} aria-label="close" className="grid h-7 w-7 shrink-0 place-items-center text-muted hover:text-clay text-h3 leading-none">×</button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="eyebrow mb-2.5">{g.title}</p>
              <div className="flex flex-col gap-2">
                {g.keys.map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-ui text-ink-2">{label}</span>
                    <span className="flex gap-1 shrink-0">{k.split(/\s+/).map((part, i) => <Kbd key={i}>{part}</Kbd>)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="px-6 pb-4 font-mono text-meta text-faint">press <span className="text-muted">?</span> anytime · <span className="text-muted">Esc</span> to close</p>
      </div>
    </div>
  );
}
