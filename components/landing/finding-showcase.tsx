"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The landing's Fig. 1 — the platform's SIGNATURE: one COMPLETE research
 * investigation, read top-to-bottom as a chaptered editorial note, the way the
 * workspace's Insight lens tells it. Not a single chart, not a mechanism demo —
 * the whole defensible arc: the finding → the factors → what drove it → WHEN IT
 * BREAKS (the candid turn) → how it was built → the memo that writes itself.
 *
 * The move that separates this from a backtest pitch is the narrative retreat:
 * chapter 04 honestly undercuts the claim ("paid in mean-reverting weeks — gave
 * it back when the market trended"), with the DOWN-regime ribbon proven to sit
 * exactly on the drawdown. Every number is real (authored, internally
 * consistent with lib/fixtures): Sharpe 1.42, +18.7%/yr, −8.3% dd, the
 * crude–gas signals, the ridge weights, the 7-step lineage. (Design · v3.)
 */

const c = "var(--color-clay)";
const ink = "var(--color-ink)";
const ink2 = "var(--color-ink-2)";
const faint = "var(--color-faint)";
const hair = "var(--color-hairline)";
const hair2 = "var(--color-hairline-2)";
const BLUE = "#1F4E79";
const SAGE = "#7A8B6F";
const NOTRADE = "#CBC7BB";
const PAPER = "#FAF7F1";
const TX = { fontFamily: "var(--font-jetbrains)" } as const;

// ── the authored story (verified against lib/fixtures; the landing hardcodes
//    its illustration the same way FindingShowcase/FactSheet always have) ──
const EQ = [0.0, 1.0, 2.2, 3.4, 4.6, 5.8, 6.9, 8.0, 7.1, 5.4, 3.2, 1.1, -0.3, 1.4, 3.0, 4.3, 5.5, 6.4, 7.2, 7.9, 8.4, 8.0, 8.7, 9.1, 8.8, 9.4];
const REG = ["MR", "MR", "MR", "MR", "MR", "UP", "MR", "MR", "DOWN", "DOWN", "DOWN", "DOWN", "DOWN", "MR", "MR", "MR", "MR", "MR", "MR", "UP", "NO_TRADE", "NO_TRADE", "MR", "MR", "MR", "MR"];
const REGCOL: Record<string, string> = { MR: SAGE, UP: BLUE, DOWN: "var(--color-clay)", NO_TRADE: NOTRADE };
const CHAPTERS = [
  ["01", "the finding"], ["02", "the factors"], ["03", "what drove it"],
  ["04", "when it works"], ["05", "how it was built"], ["06", "the deliverable"],
] as const;

/* ── small helpers ───────────────────────────────────────────────── */
function Mono({ children, x, y, fill = faint, anchor = "start", fs = 10, fw = 400 }: { children: string; x: number; y: number; fill?: string; anchor?: "start" | "middle" | "end"; fs?: number; fw?: number }) {
  return <text x={x} y={y} textAnchor={anchor} fill={fill} fontSize={fs} fontWeight={fw} {...TX}>{children}</text>;
}

/* ── 01 · the equity hero — three stacked bands (line / drawdown / regime) ── */
function EquityHero() {
  const L = 52, R = 900, n = EQ.length;
  const x = (i: number) => L + (i / (n - 1)) * (R - L);
  const yA = (v: number) => 146 - ((v + 1) / 11) * (146 - 12);          // equity band, -1..10
  let mx = -99; const rm = EQ.map((v) => (mx = Math.max(mx, v)));       // running max
  const yB = (dd: number) => 158 + (-dd) / 8.3 * (196 - 158);          // drawdown band, 0..-8.3
  const cw = (R - L) / n;
  const line = EQ.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${yA(v).toFixed(1)}`).join(" ");
  const rmLine = rm.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${yA(v).toFixed(1)}`).join(" ");
  const ddArea = `M${x(0)} ${yB(0)} ` + EQ.map((v, i) => `L${x(i).toFixed(1)} ${yB(v - rm[i]).toFixed(1)}`).join(" ") + ` L${x(n - 1)} ${yB(0)} Z`;
  const lit = (i: number, v: number, label: string, below?: boolean) => (
    <g key={label}>
      <circle cx={x(i)} cy={yA(v)} r={9} fill="rgba(190,77,43,0.10)" />
      <circle cx={x(i)} cy={yA(v)} r={4} fill={c} />
      <Mono x={x(i)} y={below ? yA(v) + 17 : yA(v) - 9} anchor={i > n - 6 ? "end" : "middle"} fill={c} fw={500} fs={10.5}>{label}</Mono>
    </g>
  );
  return (
    <svg viewBox="0 0 920 232" className="block w-full h-auto" role="img" aria-label="cumulative return with drawdown and regime ribbon">
      {[0, 4, 8].map((g) => (
        <g key={g}><line x1={L} y1={yA(g)} x2={R} y2={yA(g)} stroke={hair} /><Mono x={L - 8} y={yA(g) + 3} anchor="end">{`${g}%`}</Mono></g>
      ))}
      <path d={rmLine} fill="none" stroke={hair2} strokeWidth={1} strokeDasharray="3 3" />
      <path d={`${line} L${x(n - 1)} ${yA(0)} L${x(0)} ${yA(0)} Z`} fill={BLUE} fillOpacity={0.08} />
      <path d={line} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {lit(7, 8.0, "+8.0% · late Feb")}
      {lit(12, -0.3, "−0.3% · late Mar", true)}
      {lit(25, 9.4, "+9.4%")}
      <Mono x={L - 8} y={164} anchor="end">dd</Mono>
      <path d={ddArea} fill={c} fillOpacity={0.16} />
      <path d={EQ.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${yB(v - rm[i]).toFixed(1)}`).join(" ")} fill="none" stroke={c} strokeWidth={1.2} />
      <Mono x={R} y={yB(-8.3) + 3} anchor="end" fill={c} fw={500}>−8.3% max drawdown</Mono>
      {REG.map((r, i) => <rect key={i} x={L + i * cw + 0.5} y={206} width={cw - 1} height={16} fill={REGCOL[r]} />)}
      <Mono x={L} y={232}>Jan</Mono><Mono x={(L + R) / 2} y={232} anchor="middle">regime ▸ clay = trending down</Mono><Mono x={R} y={232} anchor="end">Jun</Mono>
    </svg>
  );
}

/* ── 02 · correlation heatmap (diverging clay→paper→blue) ── */
function ramp(v: number) {
  const t = Math.max(-1, Math.min(1, v));
  const a = [190, 77, 43], b = [243, 238, 228], d = [31, 78, 121];
  const m = (lo: number[], hi: number[], k: number, idx: number) => Math.round(lo[idx] + (hi[idx] - lo[idx]) * k);
  const [lo, hi, k] = t < 0 ? [b, a, -t] : [b, d, t];
  return `rgb(${m(lo, hi, k, 0)},${m(lo, hi, k, 1)},${m(lo, hi, k, 2)})`;
}
function CorrHeatmap() {
  const M = [[1, 0.31, 0.58], [0.31, 1, -0.12], [0.58, -0.12, 1]];
  const short = ["z₂₀", "gas z", "spread"];
  const cell = 54, gx = 300, gy = 20, gap = 6;
  return (
    <svg viewBox="0 0 920 200" className="block w-full h-auto" role="img" aria-label="3 by 3 correlation heatmap">
      {M.map((rowv, i) => rowv.map((v, j) => {
        const xx = gx + j * (cell + gap), yy = gy + i * (cell + gap);
        return (
          <g key={`${i}-${j}`}>
            <rect x={xx} y={yy} width={cell} height={cell} fill={ramp(v)} stroke={hair} />
            <Mono x={xx + cell / 2} y={yy + cell / 2 + 4} anchor="middle" fill={v > 0.5 ? PAPER : ink} fw={500} fs={12}>{v.toFixed(2)}</Mono>
            {i === 0 && j === 2 && <rect x={xx - 2} y={yy - 2} width={cell + 4} height={cell + 4} fill="none" stroke={ink} strokeWidth={1.4} />}
          </g>
        );
      }))}
      {short.map((s, i) => <Mono key={`r${i}`} x={gx - 12} y={gy + i * (cell + gap) + cell / 2 + 3} anchor="end" fill={ink2} fs={11}>{s}</Mono>)}
      {short.map((s, j) => <Mono key={`c${j}`} x={gx + j * (cell + gap) + cell / 2} y={gy - 7} anchor="middle" fill={ink2} fs={11}>{s}</Mono>)}
      <Mono x={30} y={40} fs={10.5}>strongest pair</Mono>
      <Mono x={30} y={55} fill={ink2} fw={500} fs={12}>z-score ↔ spread</Mono>
      <Mono x={30} y={71} fs={10.5}>0.58 — they revert</Mono>
      <Mono x={30} y={85} fs={10.5}>together</Mono>
      <Mono x={30} y={120} fill={ink2} fw={500} fs={12}>gas z-score</Mono>
      <Mono x={30} y={135} fs={10.5}>near-independent</Mono>
      <Mono x={30} y={149} fs={10.5}>0.31 · −0.12</Mono>
      {Array.from({ length: 21 }, (_, q) => <rect key={q} x={300 + q * 9} y={176} width={9} height={9} fill={ramp(-1 + q / 10)} />)}
      <Mono x={294} y={184} anchor="end">−1</Mono><Mono x={300 + 21 * 9 + 6} y={184}>+1</Mono>
    </svg>
  );
}

/* ── 03 · signed model weights ── */
function WeightBars() {
  const W: [string, number, string][] = [["Z-score · 20", 0.42, BLUE], ["Gas z-score · 20", -0.18, "var(--color-clay)"], ["Crude–gas spread", 0.09, BLUE]];
  const zero = 460, scale = 560, row = 38, top = 24, labelX = 210;
  return (
    <svg viewBox="0 0 920 168" className="block w-full h-auto" role="img" aria-label="signed model weights">
      <line x1={zero} y1={top - 8} x2={zero} y2={top + row * 3 - 6} stroke={hair2} />
      <Mono x={zero} y={top + row * 3 + 8} anchor="middle">0</Mono>
      {W.map(([nm, v, col], i) => {
        const y = top + i * row, bw = Math.abs(v) * scale, bx = v >= 0 ? zero : zero - bw;
        return (
          <g key={nm}>
            <Mono x={labelX} y={y + 13} anchor="end" fill={ink2} fs={13}>{nm}</Mono>
            <rect x={bx} y={y + 2} width={bw} height={18} fill={col} fillOpacity={0.85} />
            <Mono x={v >= 0 ? bx + bw + 8 : bx - 8} y={y + 15} anchor={v >= 0 ? "start" : "end"} fill={col} fw={500} fs={12.5}>{`${v >= 0 ? "+" : ""}${v.toFixed(2)}`}</Mono>
          </g>
        );
      })}
    </svg>
  );
}

/* ── 04 · standalone regime ribbon with the DOWN bracket ── */
function RegimeRibbon() {
  const L = 8, R = 912, n = REG.length, cw = (R - L) / n;
  const bx1 = L + 8 * cw, bx2 = L + 13 * cw;
  return (
    <svg viewBox="0 0 920 96" className="block w-full h-auto" role="img" aria-label="weekly regime ribbon">
      {REG.map((r, i) => <rect key={i} x={L + i * cw + 0.5} y={14} width={cw - 1} height={30} fill={REGCOL[r]} />)}
      <line x1={bx1} y1={50} x2={bx2} y2={50} stroke={c} strokeWidth={1.4} />
      <line x1={bx1} y1={46} x2={bx1} y2={50} stroke={c} strokeWidth={1.4} />
      <line x1={bx2} y1={46} x2={bx2} y2={50} stroke={c} strokeWidth={1.4} />
      <Mono x={(bx1 + bx2) / 2} y={64} anchor="middle" fill={c} fw={500} fs={11}>Feb 27 – Mar 26 · the drawdown window</Mono>
      <Mono x={L} y={10}>Jan 2024</Mono><Mono x={R} y={10} anchor="end">Jun 2024</Mono>
    </svg>
  );
}

/* ── 05 · the lineage flow ── */
function Node({ kind, name, op, res, trio }: { kind?: string; name?: string; op?: string; res?: boolean; trio?: React.ReactNode }) {
  if (trio) return <div className="shrink-0 w-[136px] border border-hairline bg-paper px-2.5 py-2 flex flex-col gap-1.5">{trio}</div>;
  return (
    <div className={`shrink-0 w-[122px] border bg-paper px-2.5 py-2 ${res ? "border-clay" : "border-hairline"}`}>
      <div className={`font-mono text-[0.55rem] uppercase tracking-[0.13em] ${res ? "text-clay" : "text-faint"}`}>{kind}</div>
      <div className="mt-1 text-[0.78rem] text-ink leading-tight">{name}</div>
      <div className="mt-0.5 font-mono text-[0.58rem] text-faint">{op}</div>
    </div>
  );
}
const Arrow = () => <div className="flex items-center px-1.5 text-hairline-2 font-mono shrink-0">→</div>;
function LineageFlow() {
  const sig = (label: string, clay?: boolean, note?: string) => (
    <div className={`text-[0.7rem] text-ink-2 leading-tight border-l-2 pl-1.5 ${clay ? "border-clay" : "border-[#1F4E79]"}`}>{label}{note && <span className="text-clay text-[0.55rem]"> {note}</span>}</div>
  );
  return (
    <div className="flex items-stretch overflow-x-auto pb-1">
      <Node kind="dataset" name="WTI crude · 1m" op="3.8M rows" /><Arrow />
      <Node kind="feature" name="Front-month cont." op="stitch_contracts" /><Arrow />
      <Node kind="feature" name="Log returns" op="derive_column" /><Arrow />
      <Node trio={<>{sig("Z-score · 20", false, "14→20")}{sig("Gas z-score · 20")}{sig("Crude–gas spread", true)}</>} /><Arrow />
      <Node kind="matrix" name="Signal matrix" op="join_feature" /><Arrow />
      <Node kind="target" name="Fwd return · 5m" op="lead" /><Arrow />
      <Node kind="model" name="Ridge · α=0.1" op="fit_model" /><Arrow />
      <Node kind="result" name="Backtest · mean-rev" op="evaluate_strategy" res />
    </div>
  );
}

/* ── the chapter index rail (scroll-spy) ── */
function Rail({ active }: { active: string }) {
  return (
    <nav className="hidden lg:block sticky top-24 self-start">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint mb-3.5">The investigation</p>
      <div className="flex flex-col">
        {CHAPTERS.map(([n, t]) => {
          const on = active === n;
          return (
            <a key={n} href={`#story-${n}`} className={`flex gap-2.5 items-baseline py-[7px] pl-3.5 -ml-px border-l-2 transition-colors ${on ? "border-clay" : "border-hairline hover:border-hairline-2"}`}>
              <span className={`font-mono text-[0.68rem] ${on ? "text-clay" : "text-faint"}`}>{n}</span>
              <span className={`text-[0.81rem] ${on ? "text-ink font-medium" : "text-muted"}`}>{t}</span>
            </a>
          );
        })}
      </div>
      <p className="mt-5 pt-4 border-t border-hairline font-mono text-[0.6rem] leading-[1.7] text-faint">
        6 figures · 1 model<br />7-step lineage<br /><span className="text-green">✓ validated</span><br />no-lookahead · reproducible
      </p>
    </nav>
  );
}

/* ── one chapter shell ── */
function Chapter({ n, eyebrow, candid, children }: { n: string; eyebrow: string; candid?: boolean; children: React.ReactNode }) {
  return (
    <section
      id={`story-${n}`}
      data-ch={n}
      className={`scroll-mt-24 ${candid ? "bg-clay-wash border border-[#f0ddd2] px-6 md:px-7 py-7 -mx-2 md:-mx-7" : "pb-10 mb-9 border-b border-hairline"}`}
    >
      <p className={`font-mono text-[0.66rem] uppercase tracking-[0.15em] text-clay`}>{n} · {eyebrow}</p>
      {children}
    </section>
  );
}

/* ── the plate that frames a figure ── */
function Plate({ cap, note, ticks, bare, children }: { cap: string; note?: string; ticks?: boolean; bare?: boolean; children: React.ReactNode }) {
  return (
    <div className={`mt-[18px] ${bare ? "" : "border border-hairline bg-paper p-[18px] pb-3.5"} ${ticks ? "ticks" : ""}`}>
      <div className="flex items-center justify-between gap-3 mb-2.5 font-mono text-[0.62rem] tracking-[0.03em] text-faint">
        <span className="min-w-0 truncate">{cap}</span>{note && <span className="shrink-0">{note}</span>}
      </div>
      {children}
    </div>
  );
}

export function FindingShowcase() {
  const [active, setActive] = useState("01");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).map((e) => e.target.getAttribute("data-ch")!);
        const first = CHAPTERS.map(([n]) => n).find((n) => vis.includes(n));
        if (first) setActive(first);
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 },
    );
    ref.current?.querySelectorAll("[data-ch]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div>
      {/* the standfirst — the question and the claim, in one breath */}
      <div aria-hidden className="h-0.5 bg-clay mb-6" />
      <p className="eyebrow">An Invariant investigation · crude-oil-research · 6 chapters</p>
      <h2 className="mt-3 font-serif font-semibold tracking-[-0.02em] leading-[1.04] text-[2rem] sm:text-[2.55rem] max-w-[20ch]">
        Mean-reversion held its edge — <span className="italic font-normal text-clay">until</span> the market trended.
      </h2>
      <p className="mt-5 font-serif text-[1.12rem] leading-[1.6] text-ink-2 max-w-[64ch]">
        A complete investigation, read top to bottom. On WTI crude, Jan–Jun 2024, a 20-day z-score on the crude–gas spread earned a <b className="font-semibold text-ink">1.42 Sharpe</b> and <b className="font-semibold text-ink">+18.7% a year</b> — but it gave <b className="font-semibold text-ink">8.3% back</b> when the market trended, and this note shows exactly where. Traced from 3.8M raw 1-minute bars to a validated backtest; nothing asserted that you can&rsquo;t fall through.
      </p>
      {/* KPI dateline strip — typographic, not boxed tiles */}
      <div className="mt-7 flex flex-wrap border-t border-b border-hairline">
        {[["1.42", "Sharpe", ""], ["+18.7%", "Ann. return", "text-green"], ["−8.3%", "Max drawdown", "text-clay"], ["56.1%", "Win rate", ""], ["34%", "Turnover", ""]].map(([v, k, tone], i, a) => (
          <div key={k} className={`py-3.5 pr-7 mr-7 ${i < a.length - 1 ? "border-r border-hairline" : ""}`}>
            <div className={`font-mono text-[1.55rem] leading-none tabular-nums tracking-[-0.01em] ${tone}`}>{v}</div>
            <div className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.13em] text-muted">{k}</div>
          </div>
        ))}
      </div>
      <p className="mt-3.5 font-mono text-[0.68rem] tracking-[0.04em] text-faint">Eval 2024-01-02 → 2024-06-28 · 26 weeks · validated · no-lookahead · reproducible</p>

      {/* body: sticky index rail + the story column */}
      <div ref={ref} className="mt-8 grid lg:grid-cols-[174px_1fr] gap-10 lg:gap-12 items-start">
        <Rail active={active} />

        <div className="min-w-0">
          {/* 01 · THE FINDING */}
          <Chapter n="01" eyebrow="the finding">
            <h3 className="mt-2 font-serif text-[1.5rem] font-semibold leading-[1.22] tracking-[-0.01em] max-w-[32ch]">
              Up 9.4% over 26 weeks — but every dollar was earned in the chop, and part of it handed back in the trend.
            </h3>
            <p className="mt-3 text-[0.9rem] leading-[1.66] text-ink-2 max-w-[66ch]">
              Weekly cumulative return. It climbed to <b className="text-ink font-semibold">+8.0%</b> by late February, then the trending-DOWN weeks dragged it to <b className="text-ink font-semibold">−0.3%</b> by late March — a <b className="text-ink font-semibold">−8.3% drawdown</b> — before reverting to <b className="text-ink font-semibold">+9.4%</b>. The regime ribbon under the curve is the tell: the clay weeks are where it fell.
            </p>
            <Plate cap="Fig. 1 — cumulative return %, regime-shaded · weekly · 2024" note="authored · internally consistent" ticks>
              <EquityHero />
            </Plate>
            <div className="mt-3.5 pl-3.5 border-l-2 border-clay text-[0.84rem] text-ink-2 max-w-[64ch]">
              <b className="text-clay font-semibold">Max drawdown −8.3%</b> — drawn, not buried. You can see the week it happened.
            </div>
          </Chapter>

          {/* 02 · THE FACTORS */}
          <Chapter n="02" eyebrow="the factors">
            <h3 className="mt-2 font-serif text-[1.5rem] font-semibold leading-[1.22] tracking-[-0.01em] max-w-[32ch]">
              Three signals went into the matrix — the z-score and the spread move together; gas runs on its own.
            </h3>
            <p className="mt-3 text-[0.9rem] leading-[1.66] text-ink-2 max-w-[66ch]">
              <b className="text-ink font-semibold">zscore_20</b> (crude log-return z-score, 20-day), <b className="text-ink font-semibold">gas_z20</b> (nat-gas z-score, same window), and <b className="text-ink font-semibold">spread_5d</b> (the crude–gas cointegrated spread, 60-bar lookback). They aren&rsquo;t redundant: zscore_20 and spread_5d correlate <b className="text-ink font-semibold">0.58</b> — they revert together — while gas_z20 is nearly independent (0.31, −0.12), which is exactly why it can hedge in the next chapter.
            </p>
            <Plate cap="Fig. 2 — correlation across the three signals" note="authored from signal_matrix_v3">
              <CorrHeatmap />
            </Plate>
          </Chapter>

          {/* 03 · WHAT DROVE IT */}
          <Chapter n="03" eyebrow="what drove it">
            <p className="mt-2 font-serif italic text-[1.45rem] leading-[1.3] text-ink max-w-[26ch]">
              &ldquo;Z-score carries the signal — gas z-score leans against it.&rdquo;
            </p>
            <p className="mt-3 text-[0.9rem] leading-[1.66] text-ink-2 max-w-[66ch]">
              A ridge baseline (α=0.1) on the signal matrix, predicting the 5-minute forward return, learned three weights: <b className="text-ink font-semibold">zscore_20 +0.42</b> carries it, <b className="text-ink font-semibold">spread_5d +0.09</b> adds a little in the same direction, and <b className="text-ink font-semibold">gas_z20 −0.18</b> leans against it — damping crude-only noise.
            </p>
            <Plate cap="Fig. 3 — learned model weights · positive adds signal, negative hedges" note="ridge · linreg_baseline">
              <WeightBars />
            </Plate>
            <p className="mt-3 font-mono text-[0.66rem] text-faint">ridge · α=0.1 · target fwd_ret_5m · features signal_matrix_v3 (3 cols)</p>
          </Chapter>

          {/* 04 · WHEN IT WORKS — the candid turn */}
          <Chapter n="04" eyebrow="when it works" candid>
            <h3 className="mt-2 font-serif text-[1.5rem] font-semibold leading-[1.22] tracking-[-0.01em] text-clay-deep max-w-[32ch]">
              It paid in mean-reverting weeks — and gave it back when the market trended.
            </h3>
            <p className="mt-3 text-[0.9rem] leading-[1.66] text-ink-2 max-w-[66ch]">
              The edge is regime-dependent <b className="text-ink font-semibold">by construction</b>. Across 26 weeks, mean-reversion ruled <b className="text-ink font-semibold">17</b>, the market trended up for 2 and down for 5, and 2 were no-trade. The five trending-DOWN weeks (<b className="text-ink font-semibold">Feb 27 – Mar 26</b>) overlap the drawdown exactly — that&rsquo;s where equity slid from +8.0% to −0.3%.
            </p>
            <Plate cap="Fig. 4 — weekly regime · the DOWN phase is the drawdown window" note="authored regime series" bare>
              <RegimeRibbon />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.7rem] text-ink-2">
                {[["mean-reverting · 17", SAGE], ["trending up · 2", BLUE], ["trending down · 5", "var(--color-clay)"], ["no-trade · 2", NOTRADE]].map(([t, col]) => (
                  <span key={t} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 inline-block rounded-[1px]" style={{ background: col }} />{t}</span>
                ))}
              </div>
            </Plate>
          </Chapter>

          {/* 05 · HOW IT WAS BUILT */}
          <Chapter n="05" eyebrow="how it was built">
            <h3 className="mt-2 font-serif text-[1.5rem] font-semibold leading-[1.22] tracking-[-0.01em] max-w-[32ch]">
              Seven steps from 3.8M raw crude bars to a validated backtest — every node hashed.
            </h3>
            <p className="mt-3 text-[0.9rem] leading-[1.66] text-ink-2 max-w-[66ch]">
              <b className="text-ink font-semibold">crude_oil_1m</b> (3.8M rows) and <b className="text-ink font-semibold">nat_gas_1m</b> (Henry Hub) stitch to a continuous front-month under the Panama calendar-roll policy — no artificial roll gap — then log-returns, three signals, the matrix, a 5-minute-ahead target, the ridge model, and a dollar-neutral top-decile long/short backtest. The z-window was widened <b className="text-ink font-semibold">14→20</b> after a turnover review.
            </p>
            <Plate cap="Fig. 5 — lineage · crude_oil_1m → final backtest" note="maps to verified platform capabilities">
              <div className="flex flex-wrap gap-2.5 mb-3">
                <span className="font-mono text-[0.62rem] text-muted border border-dashed border-hairline-2 px-2 py-1">policy · <b className="text-ink-2 font-medium">roll_stitch_cl_calendar_panama</b></span>
                <span className="font-mono text-[0.62rem] text-muted border border-dashed border-hairline-2 px-2 py-1">policy · <b className="text-ink-2 font-medium">position_sizing_top_decile_long_short</b></span>
              </div>
              <LineageFlow />
            </Plate>
          </Chapter>

          {/* 06 · THE DELIVERABLE — the memo writes itself */}
          <Chapter n="06" eyebrow="the deliverable">
            <h3 className="mt-2 font-serif text-[1.5rem] font-semibold leading-[1.22] tracking-[-0.01em] max-w-[32ch]">
              The memo writes itself — what we can defend, and the next move.
            </h3>
            <p className="mt-3 text-[0.9rem] leading-[1.66] text-ink-2 max-w-[66ch]">
              Everything above traces to raw tick and reproduces. The pinned findings assemble into the deliverable — not a generic CTA, but the case you can stand behind.
            </p>
            <article className="mt-[18px] border border-ink bg-paper">
              <div className="px-5 py-4 border-b border-hairline">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-clay">Pinboard · the memo</p>
                <h4 className="mt-1.5 font-serif text-[1.18rem] font-semibold">WTI mean-reversion · what we can defend</h4>
              </div>
              <ul className="px-5 py-3.5 space-y-1.5">
                {[
                  <><b className="text-ink font-semibold">+9.4% / 1.42 Sharpe</b>, earned in 17 mean-reverting weeks.</>,
                  <>Gives back <b className="text-ink font-semibold">8.3%</b> in trends — by construction, not by accident.</>,
                  <><b className="text-ink font-semibold">No-lookahead</b>: the forward return is shifted strictly 5 minutes ahead of the signal.</>,
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.84rem] text-ink-2 leading-relaxed"><span className="text-clay font-mono shrink-0">★</span><span>{t}</span></li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-5 py-3 border-t border-hairline bg-paper-2 font-mono text-[0.68rem] text-ink-2">
                <span className="text-green">✓ validated · all validators pass</span>
                <span>🔒 no-lookahead · fwd return +5 min</span>
                <span>🔒 reproducible · hash per node</span>
                <span>⤳ regime-honest · drawdown sits in the DOWN regime</span>
              </div>
            </article>
            <div className="mt-4 flex items-stretch border border-clay bg-paper">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper bg-clay px-3.5 flex items-center shrink-0">Next →</span>
              <span className="text-[0.84rem] text-ink-2 px-3.5 py-2.5"><b className="text-ink font-semibold">Widen the z-window 20→30 bars</b> — signal concentrates in slower reversion, turnover drops further.</span>
            </div>
            <p className="mt-3 font-mono text-[0.62rem] text-faint">crude_oil_1m 3.8M rows · ridge α=0.1 · z-window 20 · coint 60-bar · eval 2024-01-02 → 2024-06-28 · published validated</p>
          </Chapter>
        </div>
      </div>
    </div>
  );
}
