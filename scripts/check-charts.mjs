#!/usr/bin/env node
// M-N · N3 guardrail: charts stay honest by construction. Fails if (a) anything
// distorts data with preserveAspectRatio="none", or (b) the chart layer synthesizes
// a series (Math.sin / Math.random) instead of binding to authored snapshot data —
// the regression that M-J fixed (curve.ts). The seam: charts render a ChartSpec
// bound to real fixture data; they never fabricate the shape.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const bad = [];

// 1. No aspect-ratio distortion anywhere in the component/app/lib tree.
const all = execSync("git ls-files components app lib", { encoding: "utf8" })
  .split("\n")
  .filter((f) => /\.(tsx?|ts)$/.test(f));
for (const f of all) {
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  if (src.includes('preserveAspectRatio="none"')) {
    bad.push(`${f}: preserveAspectRatio="none" distorts the data — use a properly-scaled figure`);
  }
}

// 2. The chart layer must not synthesize a series.
const CHART_FILES = [
  "components/workspace/figure.tsx",
  "components/workspace/preview-chart.tsx",
  "components/workspace/histogram.tsx",
  "components/dashboard/finding-viz.tsx",
  "components/workspace/compare-view.tsx",
  "lib/figures.ts",
];
for (const f of CHART_FILES) {
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  for (const pat of ["Math.sin(", "Math.random("]) {
    if (src.includes(pat)) {
      bad.push(`${f}: ${pat} — bind the chart to authored data, don't synthesize the series`);
    }
  }
}

if (bad.length) {
  console.error("\n✗ chart-honesty check failed:\n" + bad.map((b) => "  " + b).join("\n") + "\n");
  process.exit(1);
}
console.log("✓ chart honesty clean — no distortion, no synthesized series");
