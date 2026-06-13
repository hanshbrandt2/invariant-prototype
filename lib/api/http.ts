// lib/api/http.ts — the BFF hop (server-only).
//
// The browser NEVER calls the engine services. Route handlers (app/api/*) and
// server components import this; service URLs + the principal live server-side.
// See docs/MIGRATION_TO_BACKEND.md §2 and docs/adr/0002-* (no secrets in the
// browser; the contract mapping lives in lib/api).

const ARTIFACT_CATALOG_URL =
  process.env.ARTIFACT_CATALOG_URL ?? "http://localhost:8102";
const DATA_CATALOG_URL =
  process.env.DATA_CATALOG_URL ?? "http://localhost:8101";
const AGENT_RUNTIME_URL =
  process.env.AGENT_RUNTIME_URL ?? "http://localhost:8104";

/**
 * Principal headers for artifact-catalog's deny-by-default gate (ADR-0044 §3).
 * In dev the catalog runs with CATALOG_REQUIRE_PRINCIPAL=false, so absent
 * headers resolve to the SYSTEM principal (sees all). Set ENGINE_PRINCIPAL_ACTOR
 * / _ORG to scope to a real user once Clerk/Cognito identity flows through.
 */
function principalHeaders(): Record<string, string> {
  const actor = process.env.ENGINE_PRINCIPAL_ACTOR;
  const org = process.env.ENGINE_PRINCIPAL_ORG;
  if (!actor) return {}; // SYSTEM principal in dev
  return {
    "X-Principal-Actor": actor,
    ...(org ? { "X-Principal-Org": org } : {}),
  };
}

async function get<T>(base: string, path: string): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(base + path, {
      headers: { Accept: "application/json", ...principalHeaders() },
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (res.status === 404) {
      // deny-by-default returns 404 for missing OR invisible — undefined to callers
      return undefined as T;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ApiError(res.status, `${base}${path} → ${res.status}`, body);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** GET against artifact-catalog (:8102 — DERIVED artifacts, lineage, lifecycle). */
export const acGet = <T>(path: string) => get<T>(ARTIFACT_CATALOG_URL, path);

/** GET against data-catalog (:8101 — RAW definitions: products, schemas, silver). */
export const dcGet = <T>(path: string) => get<T>(DATA_CATALOG_URL, path);

/** GET against agent-runtime (:8104 — conversations + the agent loop). */
export const arGet = <T>(path: string) => get<T>(AGENT_RUNTIME_URL, path);

/** URL-encode an artifact id (it contains `:` — `feature:name:1`). */
export const encId = (id: string) => encodeURIComponent(id);
