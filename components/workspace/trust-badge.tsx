import type { Validator } from "@/lib/types";
import { validatorOk, VALIDATOR_CAVEAT } from "@/lib/validator";

export type TrustZoom = "chat" | "node" | "inspector";

/** Each validator facet maps to the pin it enforces — clicking a RED facet
 *  scrolls the contract rail and flashes that pin (wired by the rail). */
export const FACET_PIN: Record<string, string> = {
  p1: "no_lookahead",
  p2: "no_lookahead",
  p3: "no_lookahead",
  reproducible: "reproducible",
};

const GATES: { key: "p1" | "p2" | "p3"; label: string; detail: string }[] = [
  { key: "p1", label: "P1 · inputs adapted", detail: "only information available at the bar enters the decision" },
  { key: "p2", label: "P2 · target strictly future", detail: "the target is shifted forward (lead); no overlap with the inputs" },
  { key: "p3", label: "P3 · falsification scan", detail: "the forward-reach scan found no leak" },
];

function adaptednessHolds(v: Validator): boolean {
  return v.p1 === "pass" && v.p2 === "pass" && v.p3 === "pass";
}

/**
 * One validator object, three zooms — the SINGLE source of truth for trust.
 *  - chat:      a compact dot + label on a returned result.
 *  - node:      a status glyph for a canvas card.
 *  - inspector: the full P1/P2/P3 + reproducibility breakdown, with the honest
 *               "what this can't prove" panel (clay left-rule).
 * Clicking a red facet calls `onFlashPin(pinId)`; a chat/node badge fires
 * `onClick` (e.g. open the inspector, or flash the violated pin on the rail).
 */
export function TrustBadge({
  validator,
  zoom,
  onClick,
  onFlashPin,
  className,
}: {
  validator: Validator;
  zoom: TrustZoom;
  onClick?: () => void;
  onFlashPin?: (pinId: string) => void;
  className?: string;
}) {
  const ok = validatorOk(validator);
  const failPin = validator.violatedPin;

  if (zoom === "node") {
    const cls = `inline-grid place-items-center h-3.5 w-3.5 rounded-full font-mono text-meta leading-none ${
      ok ? "bg-green/10 text-green" : "bg-clay/10 text-clay"
    } ${className ?? ""}`;
    const title = ok ? "validated — P1·P2·P3 pass, lineage pinned" : `blocked: ${failPin ?? "validation"}`;
    if (onClick) return <button type="button" onClick={onClick} title={title} className={cls}>{ok ? "✓" : "!"}</button>;
    return <span title={title} className={cls}>{ok ? "✓" : "!"}</span>;
  }

  if (zoom === "chat") {
    const cls = `inline-flex items-center gap-1.5 font-mono text-meta uppercase tracking-[0.1em] ${
      ok ? "text-green" : "text-clay"
    } ${onClick ? "hover:underline" : ""} ${className ?? ""}`;
    const inner = (
      <>
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green" : "bg-clay"}`} />
        {ok ? "validated" : `blocked · ${failPin ?? "validation"}`}
      </>
    );
    if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
    return <span className={cls}>{inner}</span>;
  }

  // inspector — the full breakdown
  const repro = validator.reproducible;
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="border border-hairline">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-hairline bg-paper-2/40">
          <span className="eyebrow">adaptedness — no look-ahead</span>
          <span className={`font-mono text-meta uppercase tracking-[0.12em] ${adaptednessHolds(validator) ? "text-green" : "text-clay"}`}>
            {adaptednessHolds(validator) ? "holds" : "violated"}
          </span>
        </div>
        <div className="divide-y divide-hairline">
          {GATES.map((g) => {
            const pass = validator[g.key] === "pass";
            const inner = (
              <>
                <span className={`font-mono text-ui leading-5 shrink-0 ${pass ? "text-green" : "text-clay"}`}>{pass ? "✓" : "!"}</span>
                <span className="min-w-0">
                  <span className="block text-ui text-ink">{g.label}</span>
                  <span className="block font-mono text-meta text-muted">{g.detail}</span>
                </span>
              </>
            );
            const rowCls = "flex w-full items-start gap-3 px-4 py-2.5 text-left";
            return !pass && onFlashPin ? (
              <button key={g.key} type="button" onClick={() => onFlashPin(FACET_PIN[g.key])} className={`${rowCls} hover:bg-clay-wash`}>
                {inner}
              </button>
            ) : (
              <div key={g.key} className={rowCls}>{inner}</div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border border-hairline px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`font-mono text-ui leading-5 ${repro ? "text-green" : "text-clay"}`}>{repro ? "✓" : "!"}</span>
          <span>
            <span className="block text-ui text-ink">reproducible</span>
            <span className="block font-mono text-meta text-muted">lineage_hash + producer_code_hash pinned</span>
          </span>
        </div>
        {validator.lineageHash && <span className="font-mono text-meta text-faint">{validator.lineageHash}</span>}
      </div>

      <div className="border-l-2 border-clay pl-3.5 py-1">
        <p className="eyebrow text-clay">what this can&apos;t prove</p>
        <p className="mt-1.5 text-ui leading-[1.55] text-ink-2 max-w-[62ch]">{VALIDATOR_CAVEAT.adaptedness}</p>
        <p className="mt-2 text-ui leading-[1.55] text-ink-2 max-w-[62ch]">{VALIDATOR_CAVEAT.reproducible}</p>
      </div>
    </div>
  );
}
