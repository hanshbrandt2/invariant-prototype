"use client";

// components/live/artifact-plot.tsx — the Plot tab. Pick a contract + a window
// and see the REAL data: minute candlesticks for short ranges, a daily high–low
// band + mean-close line for long ones (granularity auto-switches). Every bar
// comes off the :8105 query endpoint (DuckDB over all 26M rows) — nothing is
// synthesized. Daily has no true open (no first() aggregation), so daily draws a
// band, not candles. OHLCV-shaped artifacts only; others get an honest note.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArtifactSeries, SeriesBar, SeriesContract, SeriesGrain } from "@/lib/types";
import {
  getLiveArtifactContracts,
  getLiveArtifactSeries,
  getLiveArtifactPreview,
} from "@/lib/data";
import { ServiceDown } from "@/components/live/service-down";
import { fmtNumber } from "@/lib/format";
import { editorial } from "@/lib/theme/editorial";

const c = editorial.color;
const OHLCV_COLS = ["canonical_id", "session_id", "ts_event", "open", "high", "low", "close", "volume"];

// ── date helpers (browser Date — deterministic over fixed YYYY-MM-DD strings) ──
const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const spanDays = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const clampDate = (v: string, lo: string, hi: string): string => (v < lo ? lo : v > hi ? hi : v);
const grainFor = (from: string, to: string): SeriesGrain => (spanDays(from, to) <= 5 ? "minute" : "daily");

const QUICK: [string, number | null][] = [["5D", 5], ["1M", 31], ["3M", 92], ["1Y", 366], ["Max", null]];

const fmtTick = (t: string, grain: SeriesGrain): string =>
  grain === "minute" ? t.slice(5, 16).replace("T", " ") : t;

// ── the chart ─────────────────────────────────────────────────────────────────

function PriceChart({ series }: { series: ArtifactSeries }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const bars = series.bars;
  const n = bars.length;

  const W = 1000, ML = 10, MR = 62;
  const priceTop = 10, priceH = 348;
  const volTop = priceTop + priceH + 26, volH = 70;
  const H = volTop + volH + 22;

  const geom = useMemo(() => {
    if (!n) return null;
    const lows = bars.map((b) => b.low), highs = bars.map((b) => b.high);
    const lo = Math.min(...lows), hi = Math.max(...highs);
    const pad = (hi - lo) * 0.06 || Math.abs(hi) * 0.01 || 0.1;
    const yLo = lo - pad, yHi = hi + pad;
    const vmax = Math.max(1, ...bars.map((b) => b.volume));
    const barW = (W - ML - MR) / n;
    const cx = (i: number) => ML + i * barW + barW / 2;
    const py = (v: number) => priceTop + ((yHi - v) / (yHi - yLo)) * priceH;
    const vy = (v: number) => volTop + volH - (v / vmax) * volH;
    return { lo, hi, yLo, yHi, vmax, barW, cx, py, vy };
  }, [bars, n]);

  if (!n || !geom) {
    return <p className="py-16 text-center text-ui text-muted">No data in this window.</p>;
  }
  const { yLo, yHi, barW, cx, py, vy } = geom;
  const bodyW = Math.max(barW * 0.6, 1);
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => yLo + (yHi - yLo) * f);
  const tickEvery = Math.max(1, Math.round(n / 7));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round((sx - ML - barW / 2) / barW);
    setHover(idx < 0 ? 0 : idx >= n ? n - 1 : idx);
  };

  const hb = hover != null ? bars[hover] : null;
  const daily = series.grain === "daily";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full select-none"
      style={{ height: "min(62vh, 560px)" }}
      preserveAspectRatio="none"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      role="img"
      aria-label="price chart"
    >
      {/* price gridlines + right-axis labels */}
      {gridY.map((g, k) => (
        <g key={k}>
          <line x1={ML} y1={py(g)} x2={W - MR} y2={py(g)} stroke={c.hairline} strokeWidth={0.5} />
          <text x={W - MR + 6} y={py(g) + 3} fontFamily="var(--font-jetbrains)" fontSize={11} fill={c.faint}>
            {g.toFixed(2)}
          </text>
        </g>
      ))}

      {/* volume bars (muted) */}
      {bars.map((b, i) => (
        <rect key={"v" + i} x={cx(i) - bodyW / 2} y={vy(b.volume)} width={bodyW} height={volTop + volH - vy(b.volume)} fill={c.hairline2} />
      ))}
      <text x={W - MR + 6} y={volTop + 10} fontFamily="var(--font-jetbrains)" fontSize={10} fill={c.faint}>vol</text>

      {daily ? (
        <>
          {/* high–low band + mean-close line */}
          <path
            d={
              "M" + bars.map((b, i) => `${cx(i)},${py(b.high)}`).join(" L ") +
              " L " + bars.slice().reverse().map((b, j) => `${cx(n - 1 - j)},${py(b.low)}`).join(" L ") + " Z"
            }
            fill={c.data}
            fillOpacity={0.1}
            stroke="none"
          />
          <polyline
            points={bars.map((b, i) => `${cx(i)},${py(b.close)}`).join(" ")}
            fill="none"
            stroke={c.data}
            strokeWidth={1.4}
          />
        </>
      ) : (
        // minute candlesticks: up = hollow blue, down = filled clay
        bars.map((b, i) => {
          const o = b.open ?? b.close;
          const up = b.close >= o;
          const col = up ? c.data : c.clay;
          const yt = py(Math.max(o, b.close));
          const h = Math.max(Math.abs(py(o) - py(b.close)), 1);
          return (
            <g key={"c" + i}>
              <line x1={cx(i)} y1={py(b.high)} x2={cx(i)} y2={py(b.low)} stroke={col} strokeWidth={1} />
              <rect x={cx(i) - bodyW / 2} y={yt} width={bodyW} height={h} fill={up ? c.paper : col} stroke={col} strokeWidth={1} />
            </g>
          );
        })
      )}

      {/* time ticks under the volume panel */}
      {bars.map((b, i) =>
        i % tickEvery === 0 ? (
          <text key={"t" + i} x={cx(i)} y={H - 5} textAnchor="middle" fontFamily="var(--font-jetbrains)" fontSize={10} fill={c.faint}>
            {fmtTick(b.t, series.grain)}
          </text>
        ) : null,
      )}

      {/* crosshair + readout */}
      {hb && (
        <g>
          <line x1={cx(hover!)} y1={priceTop} x2={cx(hover!)} y2={volTop + volH} stroke={c.ink} strokeWidth={0.5} strokeDasharray="3 3" />
          <circle cx={cx(hover!)} cy={py(hb.close)} r={2.5} fill={c.ink} />
          <g transform={`translate(${cx(hover!) < W / 2 ? cx(hover!) + 10 : cx(hover!) - 168}, ${priceTop + 6})`}>
            <rect width={158} height={daily ? 70 : 84} fill={c.paper} stroke={c.ink} strokeWidth={0.75} rx={3} />
            <text x={9} y={17} fontFamily="var(--font-jetbrains)" fontSize={11} fill={c.ink2}>{fmtTick(hb.t, series.grain)}</text>
            {(daily
              ? [["high", hb.high], ["low", hb.low], ["close·μ", hb.close]]
              : [["O", hb.open ?? hb.close], ["H", hb.high], ["L", hb.low], ["C", hb.close]]
            ).map(([k, v], r) => (
              <text key={k as string} x={9} y={34 + r * 13} fontFamily="var(--font-jetbrains)" fontSize={11} fill={c.muted}>
                {k}<tspan fill={c.ink} dx={6}>{(v as number).toFixed(2)}</tspan>
              </text>
            ))}
            <text x={9} y={(daily ? 60 : 73)} fontFamily="var(--font-jetbrains)" fontSize={11} fill={c.muted}>
              vol<tspan fill={c.ink} dx={6}>{fmtNumber(hb.volume)}</tspan>
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ── the tab ─────────────────────────────────────────────────────────────────

export function ArtifactPlot({ artifactId }: { artifactId: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [contracts, setContracts] = useState<SeriesContract[]>([]);
  const [contract, setContract] = useState<SeriesContract | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [series, setSeries] = useState<ArtifactSeries | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);

  // 1) detect OHLCV shape from the column list, then load contracts.
  useEffect(() => {
    let live = true;
    setSupported(null);
    getLiveArtifactPreview(artifactId, 1)
      .then((p) => {
        if (!live) return;
        const cols = new Set((p?.columns ?? []).map((x) => x.name));
        const miss = OHLCV_COLS.filter((cName) => !cols.has(cName));
        setMissing(miss);
        if (miss.length) {
          setSupported(false);
          return;
        }
        setSupported(true);
        return getLiveArtifactContracts(artifactId).then((cs) => {
          if (!live) return;
          setContracts(cs);
          // open on the most-liquid contract so the first view is dense + meaningful
          const best = cs.reduce((a, b) => (b.rows > a.rows ? b : a), cs[0]);
          if (best) selectContract(best);
        });
      })
      .catch((e) => live && setErr(String(e)));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId]);

  function selectContract(ct: SeriesContract) {
    setContract(ct);
    const t = ct.last;
    setTo(t);
    setFrom(clampDate(addDays(t, -5), ct.first, t)); // recent window → minute candles
  }

  // 2) (re)fetch the series whenever contract / window changes.
  useEffect(() => {
    if (!contract || !from || !to) return;
    let live = true;
    setLoadingSeries(true);
    setErr(null);
    const grain = grainFor(from, to);
    getLiveArtifactSeries(artifactId, { contract: contract.canonicalId, from, to, grain })
      .then((s) => live && setSeries(s))
      .catch((e) => live && setErr(String(e)))
      .finally(() => live && setLoadingSeries(false));
    return () => {
      live = false;
    };
  }, [artifactId, contract, from, to]);

  if (err) return <ServiceDown service="research-workbench" port={8105} error={err} reach="local" />;
  if (supported === null) return <p className="text-ui text-muted">Loading…</p>;
  if (!supported) {
    return (
      <div className="border border-hairline bg-paper-2/40 p-4">
        <p className="text-ui text-ink-2">The Plot tab is for OHLCV time-series artifacts.</p>
        <p className="mt-1 text-meta text-faint">
          This one is missing <span className="font-mono">{missing.join(", ")}</span>. Use the
          Data and Distributions tabs to inspect it.
        </p>
      </div>
    );
  }

  const grain = from && to ? grainFor(from, to) : "minute";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="eyebrow">Plot</p>
        {/* contract picker */}
        <select
          value={contract?.canonicalId ?? ""}
          onChange={(e) => {
            const ct = contracts.find((x) => x.canonicalId === e.target.value);
            if (ct) selectContract(ct);
          }}
          className="max-w-[300px] border border-hairline bg-paper px-2 py-1 font-mono text-meta text-ink-2 focus:border-ink-2 focus:outline-none"
        >
          {contracts.map((ct) => (
            <option key={ct.canonicalId} value={ct.canonicalId}>
              {ct.symbol ?? ct.canonicalId} · {ct.first}→{ct.last} ({fmtNumber(ct.rows)})
            </option>
          ))}
        </select>
        {/* quick ranges */}
        {contract && (
          <div className="flex items-center gap-1">
            {QUICK.map(([label, days]) => (
              <button
                key={label}
                onClick={() => {
                  const t = contract.last;
                  setTo(t);
                  setFrom(days == null ? contract.first : clampDate(addDays(t, -days), contract.first, t));
                }}
                className="border border-hairline px-2 py-0.5 font-mono text-micro text-ink-2 transition-colors hover:border-ink-2"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {/* date inputs */}
        {contract && (
          <div className="flex items-center gap-1 font-mono text-micro text-muted">
            <input type="date" value={from} min={contract.first} max={to} onChange={(e) => setFrom(e.target.value)}
              className="border border-hairline bg-paper px-1.5 py-0.5 text-ink-2 focus:border-ink-2 focus:outline-none" />
            <span>→</span>
            <input type="date" value={to} min={from} max={contract.last} onChange={(e) => setTo(e.target.value)}
              className="border border-hairline bg-paper px-1.5 py-0.5 text-ink-2 focus:border-ink-2 focus:outline-none" />
          </div>
        )}
        <span className="font-mono text-micro uppercase tracking-[0.1em] text-faint">
          {grain === "minute" ? "minute candles" : "daily band · mean close"}
        </span>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> real · research-workbench
        </span>
      </div>

      {loadingSeries && !series ? (
        <p className="py-16 text-center text-ui text-muted">Querying…</p>
      ) : series ? (
        <div className={loadingSeries ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <PriceChart series={series} />
          <p className="mt-1 text-meta text-faint">
            {series.bars.length.toLocaleString()} {grain === "minute" ? "minute bars" : "sessions"}
            {series.truncated && " · truncated at the query cap"}
            {grain === "daily" && " · daily open is omitted (no first() aggregation) — band shows the session high–low, line the mean close"}
          </p>
        </div>
      ) : (
        <p className="py-16 text-center text-ui text-muted">Pick a contract to plot.</p>
      )}
    </div>
  );
}
