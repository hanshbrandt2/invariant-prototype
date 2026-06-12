#!/usr/bin/env node
// M-T guardrail (the cardinal rule): components are dumb — they read data through
// the single `lib/data` seam, never a store or a fixture directly. This keeps the
// fixtures→API swap a one-seam change. Pure helpers (lib/session-tree, lib/figures,
// lib/theme, lib/format, lib/validator, …) are fine to import directly; only the
// DATA SOURCE (stores + fixtures) must go through lib/data.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("git ls-files components", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

const BAD = /from\s+["']@\/lib\/(?:[\w-]*-store|fixtures(?:\/[\w-]+)?)["']/;
const bad = [];
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (BAD.test(line)) bad.push(`  ${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
  });
}

if (bad.length) {
  console.error(`\n✗ ${bad.length} component(s) import a store/fixture directly — read through @/lib/data instead:\n`);
  console.error(bad.join("\n") + "\n");
  process.exit(1);
}
console.log("✓ data seam clean — components read through @/lib/data, not stores/fixtures");
