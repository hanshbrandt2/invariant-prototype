"use client";

import { useEffect, useRef, useState } from "react";

/** Trigger a client-side file download from a string (no backend). */
function download(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export the workspace. Everything reproducible round-trips to a file the user
 * can run or read: the whole-project Python script, and the conversation as
 * markdown. "Push to GitHub" is honestly stubbed — it needs a connected repo,
 * which the frontend prototype doesn't have, so it says so rather than faking it.
 */
export function ExportMenu({
  workspaceName,
  getScript,
  getConversation,
}: {
  workspaceName: string;
  getScript: () => string;
  getConversation: () => string;
}) {
  const [open, setOpen] = useState(false);
  const [ghNote, setGhNote] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const slug = workspaceName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setGhNote(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-hairline bg-paper px-3 py-1.5   transition-colors text-[0.82rem] text-muted hover:text-ink"
      >
        Export
        <span className={`text-[0.6rem] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-lg bg-white  border border-hairline overflow-hidden z-40">
          <button
            onClick={() => { download(`${slug}.py`, getScript(), "text/x-python"); setOpen(false); }}
            className="flex w-full items-start gap-3 px-4 py-2.5 hover:bg-paper-2/60 transition-colors text-left"
          >
            <span className="font-mono text-[0.7rem] text-clay mt-0.5">.py</span>
            <span className="min-w-0">
              <span className="block text-[0.85rem] text-ink">Project script</span>
              <span className="block font-mono text-[0.66rem] text-faint">the whole pipeline, reproducible</span>
            </span>
          </button>
          <button
            onClick={() => { download(`${slug}.md`, getConversation(), "text/markdown"); setOpen(false); }}
            className="flex w-full items-start gap-3 px-4 py-2.5 border-t border-hairline hover:bg-paper-2/60 transition-colors text-left"
          >
            <span className="font-mono text-[0.7rem] text-clay mt-0.5">.md</span>
            <span className="min-w-0">
              <span className="block text-[0.85rem] text-ink">Conversation</span>
              <span className="block font-mono text-[0.66rem] text-faint">the transcript, as markdown</span>
            </span>
          </button>
          <button
            onClick={() => setGhNote((g) => !g)}
            className="flex w-full items-start gap-3 px-4 py-2.5 border-t border-hairline hover:bg-paper-2/60 transition-colors text-left"
          >
            <span className="font-mono text-[0.7rem] text-faint mt-0.5">↗</span>
            <span className="min-w-0">
              <span className="block text-[0.85rem] text-ink-2">Push to GitHub</span>
              <span className="block font-mono text-[0.66rem] text-faint">{ghNote ? "needs a connected repo — not wired in this prototype" : "commit the project to a repo"}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
