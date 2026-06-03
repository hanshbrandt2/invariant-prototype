import type { LineageSubgraph } from "@/lib/types";
import { fig1Lineage } from "@/lib/fixtures/fig1-lineage";

/**
 * The only place that knows where data comes from. Fixtures-backed now,
 * `fetch()`-backed later — components read through here, never import
 * fixtures or call fetch directly.
 *
 * When the backend exists, this returns a real `crude-oil-research` lineage
 * export (honest by construction) with no change to its callers.
 */
export async function getFig1Lineage(): Promise<LineageSubgraph> {
  return fig1Lineage;
}
