import type { PublishedFinding } from "@/lib/types";

/**
 * The published-findings store — where published findings actually live in the
 * frontend prototype: the browser's localStorage. Findings persist across reload
 * and navigation, and survive as a real client-side record (no backend yet). When
 * a backend lands this swaps for an API behind the same calls — one seam. Server
 * calls are safe no-ops (guarded on `window`).
 */
const KEY = "invariant.published-findings";

export function loadLocalFindings(): PublishedFinding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublishedFinding[]) : [];
  } catch {
    return [];
  }
}

/** Pin a finding to the store (one per result — re-publishing updates it, newest first). */
export function publishFinding(f: PublishedFinding): void {
  if (typeof window === "undefined") return;
  const rest = loadLocalFindings().filter((x) => x.id !== f.id);
  window.localStorage.setItem(KEY, JSON.stringify([f, ...rest]));
}
