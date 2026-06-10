// Editorial theme tokens — the JS-side mirror of the CSS @theme tokens in
// globals.css, plus the chart ramps. This is the SINGLE source of truth for any
// color/font that reaches chart code (Recharts props, inline SVG), so the
// data-blue / clay / hairline palette can be retuned in one place instead of
// re-typed as hex literals per chart file.
//
// Ported from the sibling viz-engine harness (apps/harness/src/theme/editorial.ts)
// — same tokens, extended with Invariant's paper/ink ramp and green/blue. When
// @invariant/viz lands (Phase 1), figures read the same palette through the
// compiled engine; this file stays the seam.
//
// "Beautiful by default": quiet paper, high-contrast type, few colors, hairline
// gridlines, direct labels over legends. Titles are findings, not labels.

export const editorial = {
  color: {
    paper: "#FAF7F1",
    paper2: "#F3EEE4",
    paper3: "#ECE5D6",
    ink: "#1C1B18",
    ink2: "#4A463D", // secondary ink (ink70 in the viz harness)
    muted: "#837C6E",
    faint: "#A9A194",
    data: "#1F4E79", // data blue — primary series
    clay: "#BE4D2B", // clay accent — emphasis / negative, used sparingly
    clayDeep: "#9C3C20",
    clayWash: "#FBF1EC",
    hairline: "#E7E1D5", // gridlines, rules, borders
    hairline2: "#D8D0BF",
    green: "#3B6D11",
    blue: "#1F4E79",
  },
  // Categorical palette: data blue + clay + ink, then quiet extensions.
  // Few colors by design — direct labels are preferred over legends.
  categorical: ["#1F4E79", "#BE4D2B", "#1C1B18", "#7A8B6F", "#9C6B3F", "#4A6D8C"],
  // Diverging scale centered at 0 (correlation heatmaps): clay → paper → data.
  diverging: ["#BE4D2B", "#E3B9A6", "#FAF7F1", "#9DB6CD", "#1F4E79"],
  // Sequential scale (confusion matrix, density): paper → data blue.
  sequential: ["#FAF7F1", "#CDD9E4", "#9DB6CD", "#5B86A9", "#1F4E79"],
  font: {
    serif: "var(--font-source-serif), Georgia, serif",
    sans: "var(--font-inter), system-ui, sans-serif",
    mono: "var(--font-jetbrains), ui-monospace, monospace",
  },
} as const;

// Regime state → color (UP / DOWN / MR / NO_TRADE), used by the regime ribbon.
export const regimeColors: Record<string, string> = {
  UP: "#1F4E79",
  DOWN: "#BE4D2B",
  MR: "#7A8B6F",
  NO_TRADE: "#CBC7BB", // quiet grey — "do nothing" reads as absence of signal
};

export type EditorialColor = keyof typeof editorial.color;
