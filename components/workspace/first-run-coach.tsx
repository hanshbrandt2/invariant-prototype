"use client";

import { useEffect, useState } from "react";

const KEY = "inv-coach-v1";

/**
 * A one-shot, dismissible first-run coach (M-M · M3). It teaches the answer-first
 * model in one calm line — the finding leads, the graph is "how", the contract is
 * the proof — so a newcomer reads CONNECTION in words, not by decoding a diagram.
 * Gated on localStorage so it shows exactly once; never blocks interaction.
 */
export function FirstRunCoach() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* private mode / no storage — just don't show */
    }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <div className="shrink-0 flex items-center gap-4 px-5 py-2 border-b border-hairline bg-paper-2/60">
      <span className="font-mono text-meta uppercase tracking-[0.13em] text-clay shrink-0">new here</span>
      <span className="text-ui text-ink-2 min-w-0">
        <b className="font-medium text-ink">This is the insight.</b>{" "}
        Read it top-to-bottom — the result, what drove it, when it worked. The full lineage lives in the Graph lens.
      </span>
      <button
        onClick={dismiss}
        className="ml-auto shrink-0 font-mono text-meta uppercase tracking-[0.1em] border border-ink text-ink px-3 py-1 hover:bg-ink hover:text-paper transition-colors"
      >
        got it
      </button>
    </div>
  );
}
