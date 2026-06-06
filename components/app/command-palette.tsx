"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchCatalog } from "@/lib/data";
import type { SearchHit } from "@/lib/types";

const TYPE_TAG: Record<SearchHit["type"], string> = {
  workspace: "WORKSPACE",
  artifact: "ARTIFACT",
  dataset: "DATASET",
};

/**
 * ⌘K / Ctrl-K command palette — search across workspaces, artifacts, and hosted
 * datasets through the data seam (`searchCatalog`). Selecting a hit deep-links
 * to its workspace + inspector. Mounted once in the app shell.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);

  // reset + reveal / hide are run from event handlers, not effects, so the
  // state writes never fire synchronously inside an effect body.
  const reveal = () => { openRef.current = true; setQ(""); setHits([]); setActive(0); setOpen(true); };
  const hide = () => { openRef.current = false; setOpen(false); };

  // global hotkey (⌘K / Ctrl-K) + the sidebar's custom open event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) hide();
        else reveal();
      } else if (e.key === "Escape") {
        hide();
      }
    };
    const onOpen = () => reveal();
    window.addEventListener("keydown", onKey);
    window.addEventListener("inv:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("inv:open-search", onOpen);
    };
  }, []);

  // focus the field once open (DOM side-effect only — no state writes)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // query the seam as the user types (setState lives in the async callback)
  useEffect(() => {
    let live = true;
    searchCatalog(q).then((r) => { if (live) { setHits(r); setActive(0); } });
    return () => { live = false; };
  }, [q]);

  if (!open) return null;

  const go = (h: SearchHit) => {
    hide();
    router.push(h.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active]); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[12vh]">
      <button aria-label="dismiss" onClick={hide} className="absolute inset-0 bg-ink/20 backdrop-blur-[2px] cursor-default" />
      <div className="relative w-full max-w-[560px] rounded-2xl bg-white shadow-float border border-hairline overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
          <span className="font-mono text-[0.7rem] text-faint">⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search workspaces, artifacts, datasets…"
            className="flex-1 bg-transparent outline-none text-[0.95rem] text-ink placeholder:text-muted"
          />
        </div>
        <div className="max-h-[52vh] overflow-y-auto">
          {q && hits.length === 0 && (
            <p className="px-4 py-6 text-[0.85rem] text-muted text-center">No matches for “{q}”.</p>
          )}
          {!q && (
            <p className="px-4 py-6 font-mono text-[0.74rem] text-faint text-center">type to search · ↑↓ to move · ↵ to open</p>
          )}
          {hits.map((h, i) => (
            <button
              key={`${h.type}:${h.id}`}
              onClick={() => go(h)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? "bg-paper-2/70" : "hover:bg-paper-2/40"}`}
            >
              <span className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted w-[68px] shrink-0">{TYPE_TAG[h.type]}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9rem] text-ink truncate">{h.title}</span>
                <span className="block font-mono text-[0.68rem] text-faint truncate">{h.subtitle}</span>
              </span>
              {i === active && <span className="font-mono text-[0.7rem] text-clay shrink-0">↵</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
