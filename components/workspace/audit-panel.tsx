"use client";

import { useEffect, useRef } from "react";
import type { Pin, Vintage } from "@/lib/types";

/**
 * The audit panel — the contract machinery, on demand. Phase 2 kept the pins /
 * integrity seal / validator in an always-on rail over the canvas; that read as
 * compliance chrome and stole the hero's space. Now the honesty layer is the
 * ENGINE: it stays wired (it still gates publish and halts the agentic run), but
 * it lives behind one quiet "audit" affordance and opens as a right slide-over
 * only when you ask "how do I know this is true?". (ADR-0001 · D3.)
 *
 * Trust by default is something you DO — trace a number to its source (the dive)
 * — not a wall of green ticks. This panel is the proof on demand: the laws on
 * this canvas, what each holds / enforces / can't prove, and the seal verdict.
 */
export function AuditPanel({
  pins,
  vintages,
  sealOk,
  openPinId,
  onOpenPin,
  onToggle,
  flashedPin,
  onFlashHandled,
  onClose,
}: {
  pins: Pin[];
  vintages: Vintage[];
  sealOk: boolean;
  openPinId: string | null;
  onOpenPin: (id: string | null) => void;
  onToggle: (id: string) => void;
  flashedPin?: string | null;
  onFlashHandled?: () => void;
  onClose: () => void;
}) {
  const inForce = pins.filter((p) => p.state === "structural" || p.state === "active").length;
  const open = pins.find((p) => p.id === openPinId) ?? null;
  const pinRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // a violated pin (agentic halt / a chat trust-badge click) scrolls into view +
  // pulses — the same flash the rail used to do, now inside the panel.
  useEffect(() => {
    if (!flashedPin) return;
    const el = pinRefs.current[flashedPin];
    el?.scrollIntoView({ block: "nearest" });
    el?.classList.add("pin-flash");
    const t = setTimeout(() => {
      el?.classList.remove("pin-flash");
      onFlashHandled?.();
    }, 1400);
    return () => clearTimeout(t);
  }, [flashedPin, onFlashHandled]);

  // ESC closes (matches the other slide-overs; a11y)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/20" onClick={onClose}>
      <div
        role="dialog"
        aria-label="audit — the contract on this canvas"
        className="drawer-in h-full w-full max-w-[560px] overflow-y-auto border-l border-hairline-2 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-3 border-b border-hairline bg-white/95 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="eyebrow text-clay">audit · lineage</p>
            <p className="font-serif text-h3 text-ink">the contract underneath</p>
          </div>
          <button onClick={onClose} aria-label="close" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-paper-2 hover:text-clay text-h3 leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <IntegritySeal inForce={inForce} sealOk={sealOk} />
          <p className="text-ui leading-relaxed text-ink-2 max-w-[60ch]">
            The laws every build on this canvas must satisfy — the engine that lets a figure be trusted.
            They run underneath; you don&apos;t have to watch them. Open one to see what it holds and what it can&apos;t prove.
          </p>

          <div className="flex flex-wrap gap-2">
            {pins.map((p) => (
              <PinChip
                key={p.id}
                pin={p}
                open={openPinId === p.id}
                chipRef={(el) => (pinRefs.current[p.id] = el)}
                onOpen={() => onOpenPin(openPinId === p.id ? null : p.id)}
              />
            ))}
          </div>

          {open && <PinDrawer pin={open} vintages={vintages} onToggle={onToggle} />}

          <p className="font-mono text-meta text-faint border-t border-hairline pt-3">No metric reaches this canvas without a lineage_hash.</p>
        </div>
      </div>
    </div>
  );
}

/* ── the integrity seal ────────────────────────────────────────────────────── */
function IntegritySeal({ inForce, sealOk }: { inForce: number; sealOk: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-meta text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${sealOk ? "bg-green" : "bg-clay"}`} />
      <span className="tabular-nums">{inForce} invariants in force</span>
      <span className="text-faint">·</span>
      <span className={sealOk ? "text-green" : "text-clay"}>{sealOk ? "validator green" : "validator: blocked"}</span>
      <span className="text-faint">·</span>
      <span>lineage pinned</span>
    </div>
  );
}

/* ── one pin chip — label + state colour only (decorators dropped) ─────────────── */
function PinChip({ pin, open, onOpen, chipRef }: { pin: Pin; open: boolean; onOpen: () => void; chipRef: (el: HTMLButtonElement | null) => void }) {
  const base = "shrink-0 inline-flex items-center px-2.5 py-1 text-meta transition-colors";
  const cls =
    pin.state === "structural"
      ? "bg-ink text-paper border border-ink"
      : pin.state === "active"
        ? "bg-clay-wash text-clay-deep border border-clay"
        : pin.state === "designed"
          ? "border border-dashed border-hairline-2 text-faint"
          : "border border-dashed border-hairline-2 text-faint hover:text-ink hover:border-ink";
  return (
    <button ref={chipRef} onClick={onOpen} className={`${base} ${cls} ${open ? "ring-1 ring-clay ring-offset-1 ring-offset-white" : ""}`} aria-expanded={open} title={pin.label}>
      {pin.label}
    </button>
  );
}

/* ── a pin's detail (holds · enforce · scope · mechanism · as-of · can't-prove) ── */
function PinDrawer({ pin, vintages, onToggle }: { pin: Pin; vintages: Vintage[]; onToggle: (id: string) => void }) {
  const togglable = pin.kind === "invariant" || pin.kind === "policy";
  const inForce = pin.state === "structural" || pin.state === "active";
  // the As-of pin's pinned knowledge date — read-only (the slider is retired)
  const pinnedAsOf = vintages[Math.max(0, vintages.map((v) => v.fencedOut).lastIndexOf(false))]?.asOf;
  return (
    <div className="border border-hairline bg-paper px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow">{pin.kind === "designed" ? "designed — not built" : pin.kind}</span>
            {pin.adr && <span className="font-mono text-meta text-faint">{pin.adr}</span>}
          </div>
          <p className="font-serif text-h3 leading-[1.5] text-ink">{pin.holds}</p>
        </div>
        <div className="shrink-0">
          {pin.state === "structural" ? (
            <span className="font-mono text-meta uppercase tracking-[0.12em] text-ink border border-ink px-2 py-1">locked</span>
          ) : pin.state === "designed" ? (
            <span className="font-mono text-meta uppercase tracking-[0.12em] text-faint border border-dashed border-hairline-2 px-2 py-1">can&apos;t be enforced</span>
          ) : togglable ? (
            <button
              onClick={() => onToggle(pin.id)}
              className={`font-mono text-meta uppercase tracking-[0.12em] px-2.5 py-1 border transition-colors ${inForce ? "bg-clay text-paper border-clay" : "border-hairline-2 text-muted hover:border-ink hover:text-ink"}`}
            >
              {inForce ? "in force ✓" : "pin it"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-1.5">how it&apos;s held</p>
          <p className="text-ui leading-[1.55] text-ink-2">{pin.enforce}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pin.gates.map((g) => (
              <span key={g} className="font-mono text-meta uppercase tracking-[0.1em] border border-hairline-2 px-1.5 py-0.5 text-muted">{g}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow mb-1.5">scope</p>
          <p className="text-ui leading-[1.55] text-ink-2">{pin.scope}</p>
          <p className="eyebrow mt-3 mb-1.5">mechanism</p>
          <code className="block font-mono text-meta text-ink bg-paper-2 border border-hairline px-2.5 py-1.5 break-words">{pin.mechanism}</code>
        </div>
      </div>

      {pin.id === "as_of" && pinnedAsOf && (
        <p className="mt-4 font-mono text-meta text-muted">pinned as-of <span className="text-ink">{pinnedAsOf}</span> · later knowledge dates fence out as vintage leakage</p>
      )}

      <div className="mt-4 border-l-2 border-clay pl-3.5 py-1">
        <p className="eyebrow text-clay">what this can&apos;t prove</p>
        <p className="mt-1.5 text-ui leading-[1.55] text-ink-2">{pin.cantProve}</p>
      </div>
    </div>
  );
}
