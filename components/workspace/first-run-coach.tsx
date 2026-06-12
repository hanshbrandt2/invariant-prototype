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
        Click any point to <b className="font-medium text-ink">trace it to the raw data</b>; <b className="font-medium text-ink">continue</b> or <b className="font-medium text-ink">fork&nbsp;⑂</b> a question (nothing is lost); <b className="font-medium text-ink">pin&nbsp;★</b> what matters to the deliverable. The contract is one click away in <b className="font-medium text-ink">audit</b>.
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
