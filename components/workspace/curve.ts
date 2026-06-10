/**
 * A deterministic pseudo equity-curve synthesised from a result's metrics, so
 * a result can lead with a visual (no Math.random — stable across renders).
 * Not real P&L; a shape that reads as "this is the finding".
 */
export function equityCurve(metrics: Record<string, number>, n = 48): { t: string; v: number }[] {
  const ann = metrics.ann_return ?? metrics.sharpe ?? 0.12;
  const dd = Math.abs(metrics.max_drawdown ?? 0.08);
  const wob = (metrics.sharpe ?? 1) ; // higher sharpe → smoother
  const out: { t: string; v: number }[] = [];
  let v = 0; // cumulative return %, rebased to 0 — clean, meaningful axis
  for (let i = 0; i < n; i++) {
    const drift = (ann * 100) / n;
    const wiggle = Math.sin(i * 0.7) * (dd * 60) / Math.max(0.5, wob);
    const dip = i > n * 0.55 && i < n * 0.7 ? -dd * 90 * Math.sin((i - n * 0.55) / (n * 0.15) * Math.PI) : 0;
    v = v + drift;
    out.push({ t: String(i + 1).padStart(2, "0"), v: +(v + wiggle + dip).toFixed(2) });
  }
  return out;
}
