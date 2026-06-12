import type { Validator } from "@/lib/types";

export type MetricFormat = "number" | "ratio" | "pct" | "signed-pct" | "int";

function fmt(v: number, f: MetricFormat): string {
  switch (f) {
    case "pct":
      return `${(v * 100).toFixed(1)}%`;
    case "signed-pct":
      return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
    case "ratio":
      return v.toFixed(2);
    case "int":
      return Math.round(v).toLocaleString();
    default:
      return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : v.toFixed(3);
  }
}

/**
 * The anti-fabrication gate. A number reaches the canvas ONLY if it arrives
 * with a lineage hash AND a validator verdict; otherwise it refuses to render
 * the value and shows a placeholder. This makes the audit promise —
 * "no metric reaches this canvas without a lineage_hash" — true by construction,
 * not by decoration. Wire every result/metric render through it.
 */
export function Metric({
  value,
  format = "number",
  validator,
  lineageHash,
  className,
}: {
  value: number | null | undefined;
  format?: MetricFormat;
  validator?: Validator | null;
  lineageHash?: string;
  className?: string;
}) {
  const hash = lineageHash ?? validator?.lineageHash;
  const proven = hash != null && validator != null;
  if (!proven || value == null || Number.isNaN(value)) {
    return (
      <span
        title={proven ? "no value" : "no lineage_hash — not shown"}
        className={`font-mono tabular-nums text-faint ${className ?? ""}`}
      >
        —<span className="ml-1.5 text-[0.5em] uppercase tracking-[0.14em] align-middle">no lineage</span>
      </span>
    );
  }
  return <span className={`font-mono tabular-nums ${className ?? ""}`}>{fmt(value, format)}</span>;
}
