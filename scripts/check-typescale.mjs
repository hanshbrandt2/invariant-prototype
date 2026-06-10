#!/usr/bin/env node
// M-I guardrail: the token spine must not regrow into 52 ad-hoc sizes.
// Fails if any app/tool component uses an arbitrary `text-[Xrem]` instead of a
// scale token (text-display/h1/h2/h3/body/ui/meta/micro). The marketing landing
// + funnel are intentionally allowlisted (bespoke editorial display type).
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ALLOW = (f) =>
  f.startsWith("components/landing/") ||
  f.startsWith("components/funnel/") ||
  f === "app/page.tsx";

const files = execSync("git ls-files components app", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".tsx") && !ALLOW(f));

const re = /text-\[[0-9.]+rem\]/;
const bad = [];
for (const f of files) {
  readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (re.test(line)) bad.push(`  ${f}:${i + 1}  ${line.trim().slice(0, 100)}`);
  });
}

if (bad.length) {
  console.error(
    `\n✗ ${bad.length} arbitrary font size(s) — use the --text-* scale tokens ` +
      `(text-display/h1/h2/h3/body/ui/meta/micro):\n`
  );
  console.error(bad.join("\n") + "\n");
  process.exit(1);
}
console.log("✓ type scale clean — no arbitrary text-[Xrem] in the tool scope");
