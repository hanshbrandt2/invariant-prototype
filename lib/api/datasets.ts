// lib/api/datasets.ts — data-catalog → HostedDataset (server-only).
//
// Maps the RAW catalog (hosted-indexes + schemas + silver-datasets) onto the
// frontend HostedDataset contract. METADATA is real (name/schema/assetClass/
// cols/coverage/rows/schemaFields); the legibility payload (sampleRows /
// columnStats / histograms) is left UNDEFINED — data-catalog holds definitions,
// not values (MAPPING.md ticket T-3). Column roles aren't in the catalog either
// (T-4). No schema drift: the shape conforms to lib/types byte-for-byte.

import { dcGet, encId } from "./http";
import type { HostedDataset, SchemaField } from "@/lib/types";

// ── data-catalog wire shapes ─────────────────────────────────────────────────
interface HostedIndexSummary {
  name: string;
  description: string;
  schema_id: string;
  member_count: number;
  updated_at: string;
}
interface HostedIndexRead extends HostedIndexSummary {
  members: { canonical_id: string; added_at: string }[];
  created_at: string;
}
interface SchemaCol {
  name: string;
  type: string;
  derived_in_silver?: boolean;
  description?: string | null;
}
interface SchemaRead {
  schema_id: string;
  name: string;
  domain: string;
  time_domain: string;
  columns: SchemaCol[];
}
interface SilverFlat {
  canonical_id: string;
  row_count: number | null;
  first_date: string | null;
  last_date: string | null;
  broad_class: string;
}
/** Per-instrument silver detail (GET /instruments/{cid}/silver/{schema}). No broad_class. */
interface SilverRow {
  canonical_id: string;
  row_count: number | null;
  first_date: string | null;
  last_date: string | null;
}

// ── pure mappers ─────────────────────────────────────────────────────────────
/** data-catalog broad_class → the strict HostedDataset.assetClass union.
 *  No drift: anything unrecognised falls back to a valid union member. */
function mapAssetClass(bc?: string): HostedDataset["assetClass"] {
  switch ((bc ?? "").toLowerCase()) {
    case "equity":
    case "equities":
      return "equities";
    case "energy":
      return "energy";
    case "metal":
    case "metals":
      return "metals";
    case "fx":
    case "currency":
    case "currencies":
      return "fx";
    case "rate":
    case "rates":
    case "fixed_income":
      return "rates";
    case "crypto":
      return "crypto";
    default:
      return "equities";
  }
}

function toFields(cols: SchemaCol[]): SchemaField[] {
  // role (time/key/value) is not in the catalog (T-4) → left undefined.
  return cols.map((c) => ({ name: c.name, type: c.type }));
}

const minStr = (xs: string[]) => (xs.length ? xs.reduce((a, b) => (a < b ? a : b)) : "");
const maxStr = (xs: string[]) => (xs.length ? xs.reduce((a, b) => (a > b ? a : b)) : "");

// ── assembly ─────────────────────────────────────────────────────────────────
/** Build one HostedDataset from a hosted-index (+ its schema + members' silver). */
export async function buildHostedDataset(
  name: string,
): Promise<HostedDataset | undefined> {
  const idx = await dcGet<HostedIndexRead | undefined>(
    `/hosted-indexes/${encId(name)}`,
  );
  if (!idx) return undefined;

  const members = idx.members.map((m) => m.canonical_id);
  const exchanges = [
    ...new Set(members.map((m) => m.split(".")[0]).filter(Boolean)),
  ];

  const [schema, flatSamples, silver] = await Promise.all([
    dcGet<SchemaRead | undefined>(`/schemas/${encId(idx.schema_id)}`),
    // broad_class is exchange/instrument-level → one tiny probe per member exchange
    Promise.all(
      exchanges.map((ex) =>
        dcGet<SilverFlat[]>(
          `/silver-datasets?schema_id=${encId(idx.schema_id)}&exchange=${encId(ex)}&limit=1`,
        ).catch(() => undefined),
      ),
    ),
    // exact rows + coverage: per-member silver detail (bounded by member_count)
    Promise.all(
      members.map((cid) =>
        dcGet<SilverRow | undefined>(
          `/instruments/${encId(cid)}/silver/${encId(idx.schema_id)}`,
        ).catch(() => undefined),
      ),
    ),
  ]);

  const cols = schema?.columns ?? [];
  const broadClass = flatSamples
    .filter((x): x is SilverFlat[] => Array.isArray(x))
    .flat()
    .find((r) => r.broad_class)?.broad_class;
  const firsts = silver.map((r) => r?.first_date).filter(Boolean) as string[];
  const lasts = silver.map((r) => r?.last_date).filter(Boolean) as string[];

  return {
    id: idx.name,
    name: idx.name,
    schema: idx.schema_id,
    assetClass: mapAssetClass(broadClass),
    blurb: idx.description,
    rows: silver.reduce((s, r) => s + (r?.row_count ?? 0), 0),
    cols: cols.length,
    coverage: { start: minStr(firsts), end: maxStr(lasts) },
    missingPct: 0, // not computed from values (T-3); surface labels this
    preview: [], // a sample series needs the values layer (T-3)
    schemaFields: toFields(cols),
    // sampleRows / columnStats / histograms: undefined — labeled "pending" (T-3)
  };
}

export async function listHostedDatasets(): Promise<HostedDataset[]> {
  const idx = (await dcGet<HostedIndexSummary[]>(`/hosted-indexes`)) ?? [];
  const built = await Promise.all(idx.map((i) => buildHostedDataset(i.name)));
  return built.filter((d): d is HostedDataset => !!d);
}
