"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Consequence, Pin, Vintage } from "@/lib/types";

/**
 * The contract rail — the pinnable invariant layer, a persistent header over the
 * canvas. A row of pins = the laws every build on this canvas must satisfy:
 *  structural (locked, ink) · active (clay wash) · off (dashed, pinnable) ·
 *  designed (dashed + hatch, never pinnable). Clicking a pin opens its drawer
 *  (what it holds · how it's held · scope · mechanism · what it can't prove);
 *  the As-of pin owns the vintage slider. Below: a live consequences strip, the
 *  integrity seal, and the anti-fabrication line.
 */
export function ContractRail({
  pins,
  consequences,
  vintages,
  sealOk,
  onToggle,
  flashedPin,
  onFlashHandled,
}: {
  pins: Pin[];
  consequences: Consequence[];
  vintages: Vintage[];
  sealOk: boolean;
  onToggle: (id: string) => void;
  flashedPin?: string | null;
  onFlashHandled?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const inForce = pins.filter((p) => p.state === "structural" || p.state === "active").length;
  const activeIds = useMemo(() => new Set(pins.filter((p) => p.state === "structural" || p.state === "active").map((p) => p.id)), [pins]);
  const shownConsequences = consequences.filter((c) => !c.dependsOnPin || activeIds.has(c.dependsOnPin));
  const open = pins.find((p) => p.id === openId) ?? null;

  // a red validator facet flashes the violated pin on the rail: scroll it into
  // view + pulse it. No setState in the effect body (reduced-motion-safe).
  useEffect(() => {
    if (!flashedPin) return;
    const el = pinRefs.current[flashedPin];
    el?.scrollIntoView({ inline: "center", block: "nearest" });
    el?.classList.add("pin-flash");
    const t = setTimeout(() => {
      el?.classList.remove("pin-flash");
      onFlashHandled?.();
    }, 1400);
    return () => clearTimeout(t);
  }, [flashedPin, onFlashHandled]);

  return (
    <section aria-label="contract — the laws on this canvas" className="shrink-0 border-b border-hairline bg-paper-2/60">
      {/* pins */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        <span className="eyebrow shrink-0 pr-1">contract</span>
        {pins.map((p) => (
          <PinChip
            key={p.id}
            pin={p}
            open={openId === p.id}
            chipRef={(el) => (pinRefs.current[p.id] = el)}
            onOpen={() => setOpenId((id) => (id === p.id ? null : p.id))}
          />
        ))}
        <span className="flex-1" />
        <IntegritySeal inForce={inForce} sealOk={sealOk} />
      </div>

      {/* the drawer for the open pin */}
      {open && (
        <PinDrawer pin={open} vintages={vintages} onToggle={onToggle} onClose={() => setOpenId(null)} />
      )}

      {/* consequences — what the pinned laws DO to a build */}
      <div className="flex items-center gap-x-5 gap-y-1 flex-wrap px-3 py-1.5 border-t border-hairline">
        {shownConsequences.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[0.72rem]">
            <span className={`font-mono text-[0.72rem] leading-none ${c.kind === "blocked" ? "text-clay" : "text-green"}`}>{c.kind === "blocked" ? "✕" : "✓"}</span>
            <span className={c.kind === "blocked" ? "text-ink-2" : "text-ink-2"}>{c.text}</span>
          </span>
        ))}
      </div>

      {/* anti-fabrication line — enforced by the Metric gate, not decoration */}
      <p className="px-3 pb-1.5 font-mono text-[0.62rem] text-faint">No metric reaches this canvas without a lineage_hash.</p>
    </section>
  );
}

/* ── one pin chip ──────────────────────────────────────────────────────────── */
function PinChip({ pin, open, onOpen, chipRef }: { pin: Pin; open: boolean; onOpen: () => void; chipRef: (el: HTMLButtonElement | null) => void }) {
  const base = "shrink-0 inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] transition-colors";
  const cls =
    pin.state === "structural"
      ? "bg-ink text-paper border border-ink"
      : pin.state === "active"
        ? "bg-clay-wash text-clay-deep border border-clay"
        : pin.state === "designed"
          ? "border border-dashed border-hairline-2 text-faint pin-hatch"
          : "border border-dashed border-hairline-2 text-faint hover:text-ink hover:border-ink";
  return (
    <button ref={chipRef} onClick={onOpen} className={`${base} ${cls} ${open ? "ring-1 ring-clay ring-offset-1 ring-offset-paper-2" : ""}`} aria-expanded={open} title={pin.label}>
      {pin.state === "structural" && <span aria-hidden className="text-[0.7em]">🔒</span>}
      <span className="normal-case tracking-normal text-[0.7rem]">{pin.label}</span>
      {pin.gates.map((g) => (
        <span key={g} className={`text-[0.52rem] leading-none px-1 py-0.5 ${pin.state === "structural" ? "bg-paper/20 text-paper" : "border border-hairline-2"}`}>{g}</span>
      ))}
      {pin.state === "designed" && <span className="text-[0.52rem] tracking-[0.12em]">designed</span>}
    </button>
  );
}

/* ── the integrity seal ────────────────────────────────────────────────────── */
function IntegritySeal({ inForce, sealOk }: { inForce: number; sealOk: boolean }) {
  return (
    <div className="shrink-0 flex items-center gap-2 font-mono text-[0.62rem] text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${sealOk ? "bg-green seal-pulse" : "bg-clay"}`} />
      <span className="tabular-nums">{inForce} invariants in force</span>
      <span className="text-faint">·</span>
      <span className={sealOk ? "text-green" : "text-clay"}>{sealOk ? "validator green" : "validator: blocked"}</span>
      <span className="text-faint">·</span>
      <span>lineage pinned</span>
    </div>
  );
}

/* ── a pin's drawer ────────────────────────────────────────────────────────── */
function PinDrawer({ pin, vintages, onToggle, onClose }: { pin: Pin; vintages: Vintage[]; onToggle: (id: string) => void; onClose: () => void }) {
  const togglable = pin.kind === "invariant" || pin.kind === "policy";
  const inForce = pin.state === "structural" || pin.state === "active";
  return (
    <div className="border-t border-hairline bg-paper px-4 py-4 md:px-6">
      <div className="flex items-start justify-between gap-4 max-w-[78ch]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow">{pin.kind === "designed" ? "designed — not built" : pin.kind}</span>
            {pin.adr && <span className="font-mono text-[0.62rem] text-faint">{pin.adr}</span>}
          </div>
          {/* what it holds */}
          <p className="font-serif text-[1.12rem] leading-[1.5] text-ink">{pin.holds}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {pin.state === "structural" ? (
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-ink border border-ink px-2 py-1">🔒 locked</span>
          ) : pin.state === "designed" ? (
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint border border-dashed border-hairline-2 px-2 py-1">can&apos;t be enforced</span>
          ) : togglable ? (
            <button
              onClick={() => onToggle(pin.id)}
              className={`font-mono text-[0.62rem] uppercase tracking-[0.12em] px-2.5 py-1 border transition-colors ${inForce ? "bg-clay text-paper border-clay" : "border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
            >
              {inForce ? "in force ✓" : "pin it"}
            </button>
          ) : null}
          <button onClick={onClose} className="grid h-7 w-7 place-items-center text-muted hover:text-clay text-[1.05rem] leading-none" aria-label="close">×</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 max-w-[96ch]">
        {/* how it's held */}
        <div>
          <p className="eyebrow mb-1.5">how it&apos;s held</p>
          <p className="text-[0.86rem] leading-[1.55] text-ink-2">{pin.enforce}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pin.gates.map((g) => (
              <span key={g} className="font-mono text-[0.6rem] uppercase tracking-[0.1em] border border-hairline-2 px-1.5 py-0.5 text-muted">{g}</span>
            ))}
          </div>
        </div>
        {/* scope */}
        <div>
          <p className="eyebrow mb-1.5">scope</p>
          <p className="text-[0.86rem] leading-[1.55] text-ink-2">{pin.scope}</p>
          <p className="eyebrow mt-3 mb-1.5">mechanism</p>
          <code className="block font-mono text-[0.74rem] text-ink bg-paper-2 border border-hairline px-2.5 py-1.5 break-words">{pin.mechanism}</code>
        </div>
      </div>

      {/* the As-of pin owns the vintage slider */}
      {pin.id === "as_of" && <VintageSlider vintages={vintages} />}

      {/* what this can't prove — the honest limit */}
      <div className="mt-4 border-l-2 border-clay pl-3.5 py-1 max-w-[80ch]">
        <p className="eyebrow text-clay">what this can&apos;t prove</p>
        <p className="mt-1.5 text-[0.86rem] leading-[1.55] text-ink-2">{pin.cantProve}</p>
      </div>
    </div>
  );
}

/* ── the vintage slider (promoted into the As-of pin) ──────────────────────────
   Drag the as-of over discrete knowledge dates; the revision-bearing figure
   updates (live-vs-vintage: same / moved); dates after the pinned as-of fence
   out as vintage leakage. */
function VintageSlider({ vintages }: { vintages: Vintage[] }) {
  const pinnedIdx = Math.max(0, vintages.map((v) => v.fencedOut).lastIndexOf(false));
  const [idx, setIdx] = useState(pinnedIdx);
  const v = vintages[idx];
  if (!v) return null;
  return (
    <div className="mt-4 border border-hairline bg-paper-2/40 px-4 py-3 max-w-[80ch]">
      <div className="flex items-baseline justify-between mb-2">
        <p className="eyebrow">vintage slider · as-of knowledge time</p>
        <span className="font-mono text-[0.66rem] text-faint">pinned {vintages[pinnedIdx]?.asOf}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <div className="font-mono text-[0.62rem] text-muted">{v.asOf}</div>
          <div className="font-mono text-[1.4rem] tabular-nums text-ink leading-tight">{v.value.toFixed(2)}</div>
          <div className={`font-mono text-[0.6rem] ${v.fencedOut ? "text-clay" : v.moved ? "text-clay-deep" : "text-green"}`}>
            {v.fencedOut ? "fenced out — vintage leakage" : v.moved ? "moved vs first print" : "same as first print"}
          </div>
        </div>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={vintages.length - 1}
            step={1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            aria-label="as-of knowledge date"
            className="w-full accent-clay"
          />
          <div className="mt-1 flex justify-between">
            {vintages.map((vt, i) => (
              <button
                key={vt.asOf}
                onClick={() => setIdx(i)}
                title={vt.note}
                className={`font-mono text-[0.56rem] ${i === idx ? "text-clay" : vt.fencedOut ? "text-faint/70 line-through" : "text-faint hover:text-ink"}`}
              >
                {vt.asOf.slice(2, 7)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {v.note && <p className="mt-2 text-[0.78rem] text-muted">{v.note}</p>}
    </div>
  );
}
