/**
 * The landing's Fig. 1 — the PRODUCT as ONE confident hero: the finding (a large,
 * smooth, correctly-labeled equity curve) and the TRACE to raw (one lit clay point
 * threading to a 1-minute candlestick inset). The lineage DAG is the internal
 * engine, not the pitch; the session/pinboard live in the product, not crammed
 * here. Clay does exactly one job: the traceable point. (Design audit · top move.)
 */

const c = "var(--color-clay)";
const ink = "var(--color-ink)";
const faint = "var(--color-faint)";
const hair = "var(--color-hairline)";
const DATA = "#1F4E79";
// a smooth monotone cubic through the authored anchors (Catmull-Rom → bezier),
// not a connect-the-dots sawtooth.
const LINE =
  "M40.0 178.0 C 72.0 157.0, 185.3 48.3, 232.0 52.0 C 278.7 55.7, 280.3 192.7, 320.0 200.0 C 359.7 207.3, 430.0 117.7, 470.0 96.0 C 510.0 74.3, 531.7 76.7, 560.0 70.0 C 588.3 63.3, 612.7 62.7, 640.0 56.0 C 667.3 49.3, 710.0 34.3, 724.0 30.0";

function Kpi({ v, k, tone }: { v: string; k: string; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className={`font-mono text-[2.05rem] leading-none tabular-nums tracking-[-0.02em] ${tone === "pos" ? "text-[#3B6D11]" : tone === "neg" ? "text-clay" : "text-ink"}`}>{v}</div>
      <div className="mt-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted">{k}</div>
    </div>
  );
}

/** The equity hero — big, smooth, one neutral regime band, refined annotations. */
function EquitySpecimen() {
  return (
    <svg viewBox="0 0 760 290" className="block w-full h-auto" role="img" aria-label="cumulative return with a traceable point">
      {/* one quiet regime band (the trending drawdown stretch), neutral warm-grey */}
      <rect x="232" y="14" width="88" height="214" fill="rgba(140,120,100,0.06)" />
      <line x1="232" y1="14" x2="232" y2="228" stroke={hair} />
      <line x1="320" y1="14" x2="320" y2="228" stroke={hair} />
      <text x="276" y="26" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="8.5" fill={faint} letterSpacing="1">TRENDING</text>
      {/* gridlines */}
      <line x1="40" y1="40" x2="724" y2="40" stroke={hair} />
      <line x1="40" y1="110" x2="724" y2="110" stroke={hair} />
      <line x1="40" y1="180" x2="724" y2="180" stroke={hair} />
      <text x="32" y="43.5" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="10.5" fill={faint} style={{ fontVariantNumeric: "slashed-zero" }}>8%</text>
      <text x="32" y="113.5" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="10.5" fill={faint} style={{ fontVariantNumeric: "slashed-zero" }}>4%</text>
      <text x="32" y="183.5" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="10.5" fill={faint} style={{ fontVariantNumeric: "slashed-zero" }}>0%</text>
      {/* equity line (no muddy fill — the line carries the curve over clean bands) */}
      <path d={LINE} fill="none" stroke={DATA} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {/* peak → trough story, quiet */}
      <circle cx="232" cy="52" r="3.2" fill={DATA} />
      <text x="232" y="42" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="10.5" fontWeight="500" fill={ink}>peak +8.0%</text>
      <circle cx="320" cy="200" r="3.2" fill={faint} />
      <text x="328" y="160" fontFamily="var(--font-jetbrains)" fontSize="11" fontWeight="500" fill="var(--color-muted)">&minus;8.3% drawdown</text>
      {/* end value */}
      <circle cx="724" cy="30" r="3.4" fill={DATA} />
      <text x="716" y="24" textAnchor="end" fontFamily="var(--font-jetbrains)" fontSize="13" fontWeight="600" fill={ink}>+9.4%</text>
      {/* THE TRACE POINT — the ONE clay element: lit, ringed, with a soft halo */}
      <circle cx="470" cy="96" r="11" fill="rgba(190,77,43,0.10)" />
      <circle cx="470" cy="96" r="6.5" fill="none" stroke={c} strokeWidth="1.6" />
      <circle cx="470" cy="96" r="3.2" fill={c} />
      <path d="M476 96 C 560 96, 600 150, 724 150" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.7" />
      <text x="486" y="88" fontFamily="var(--font-jetbrains)" fontSize="9.5" fill={c}>trace ↓</text>
      {/* month axis */}
      {[["Jan", 72], ["Feb", 232], ["Mar", 320], ["Apr", 470], ["May", 600], ["Jun", 700]].map(([m, x]) => (
        <text key={m as string} x={x as number} y="248" textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize="9" fill={faint}>{m}</text>
      ))}
      {/* legend */}
      <rect x="40" y="270" width="10" height="10" fill="rgba(140,120,100,0.12)" stroke={hair} />
      <text x="56" y="279" fontFamily="var(--font-jetbrains)" fontSize="9" fill="var(--color-muted)">trending regime — where it gave back</text>
      <circle cx="372" cy="275" r="3.2" fill={c} />
      <text x="382" y="279" fontFamily="var(--font-jetbrains)" fontSize="9" fill="var(--color-muted)">click any point to trace it to the raw tick</text>
    </svg>
  );
}

/** The trace target — the same moment at 1-minute resolution. */
function RawCandles() {
  const up = (x: number, y: number, h: number, wickTop: number, wickBot: number) => (
    <g key={x}><line x1={x} y1={wickTop} x2={x} y2={wickBot} stroke={DATA} strokeWidth="1.4" /><rect x={x - 5} y={y} width="10" height={h} fill="var(--color-paper)" stroke={DATA} strokeWidth="1.4" /></g>
  );
  const down = (x: number, y: number, h: number, wickTop: number, wickBot: number) => (
    <g key={x}><line x1={x} y1={wickTop} x2={x} y2={wickBot} stroke={c} strokeWidth="1.4" /><rect x={x - 5} y={y} width="10" height={h} fill={c} /></g>
  );
  return (
    <svg viewBox="0 0 240 150" className="block w-full h-auto" role="img" aria-label="1-minute candles">
      <line x1="6" y1="30" x2="234" y2="30" stroke={hair} /><line x1="6" y1="80" x2="234" y2="80" stroke={hair} /><line x1="6" y1="130" x2="234" y2="130" stroke={hair} />
      {up(24, 58, 26, 40, 96)}{up(48, 44, 22, 34, 78)}{down(72, 50, 30, 40, 92)}{up(96, 62, 24, 46, 100)}
      {up(120, 40, 22, 30, 74)}{down(144, 54, 28, 42, 96)}{up(168, 50, 22, 38, 86)}{up(192, 36, 20, 28, 70)}{down(216, 44, 22, 34, 82)}
    </svg>
  );
}

export function FindingShowcase() {
  return (
    <article className="ticks relative border border-hairline bg-paper px-6 md:px-7 py-6">
      <div className="flex items-end justify-between gap-7 flex-wrap mb-1.5">
        <h3 className="font-serif text-[1.3rem] font-semibold text-ink-2 leading-snug max-w-[30ch]">
          WTI front-month mean-reversion · 2024 — about 1.4&times; return per unit of risk.
        </h3>
        <div className="flex items-baseline gap-7 shrink-0">
          <Kpi v="1.42" k="Sharpe" />
          <Kpi v="18.7%" k="ann. return" tone="pos" />
          <Kpi v="−8.3%" k="max drawdown" tone="neg" />
        </div>
      </div>
      <p className="font-mono text-[0.7rem] text-faint mb-2">cumulative return % · 2024-01-02 → 2024-06-28 · authored snapshot</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_264px] gap-0">
        <EquitySpecimen />
        <div className="lg:border-l lg:border-dashed lg:border-hairline-2 lg:pl-6 lg:ml-6 mt-6 lg:mt-0 flex flex-col justify-center">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.13em] text-clay mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-clay mr-1.5 align-middle" />traced to the raw bars
          </p>
          <RawCandles />
          <p className="mt-2.5 font-mono text-[0.66rem] text-faint leading-relaxed">
            WTI front-month · 1-minute OHLC<br />crude_oil_1m · the source. Nothing is hidden.
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between flex-wrap gap-2">
        <span className="font-mono text-[0.7rem] text-faint">
          <span className="inline-block w-2 h-2 rounded-full bg-[#3B6D11] mr-1.5 align-middle" />validated · no look-ahead · reproducible
        </span>
        <span className="font-mono text-[0.7rem] text-muted">return → signal → spread → raw · one click each</span>
      </div>
    </article>
  );
}
