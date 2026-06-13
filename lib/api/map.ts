// lib/api/map.ts — the contract mapping (ADR-0002 D6).
//
// Translates the REAL engine wire shapes (snake_case Pydantic) into the
// frontend contract (`lib/types`, camelCase). See lib/api/MAPPING.md for the
// per-getter table + the backend tickets behind the gaps this layer papers over.

import type {
  Node,
  NodeKind,
  LifecycleState,
  LineageEdge,
  LineageSubgraph,
} from "@/lib/types";

// ── upstream wire shapes (artifact-catalog) ──────────────────────────────────

/** artifact-catalog `ArtifactRead` (src/artifact_catalog/schemas.py). */
export interface ArtifactRead {
  id: string;
  kind: string;
  name: string;
  version: number; // NOTE: int upstream; Node.version is string
  state: string;
  spec: unknown;
  content_hash: string | null;
  owner: string;
  source_repo: string | null;
  metadata: Record<string, unknown>;
  user_authored: boolean;
  as_of_knowledge_time: string | null;
  policy_refs: string[];
  producer_code_hash: string | null;
  pit_construction: "point_in_time" | "current_snapshot" | null;
  lineage_hash: string | null;
  output_content_hash: string | null;
  lineage_format_version: string | null;
  next_proposal: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LineageEdgeRead {
  child_id: string;
  parent_id: string | null;
  parent_external_ref: { catalog: string; id: string } | null;
  edge_kind: LineageEdge["kind"];
  created_at: string;
}

/** artifact-catalog single-hop `LineageWalkResult`. */
export interface LineageWalkResult {
  root_id: string;
  direction: "parents" | "children";
  depth: number;
  edges: LineageEdgeRead[];
}

// ── mappers ──────────────────────────────────────────────────────────────────

/** `feature:name:1` → kind segment as a NodeKind (best-effort). */
function kindFromId(id: string): NodeKind {
  return (id.split(":")[0] || "dataset") as NodeKind;
}
function nameFromId(id: string): string {
  return id.split(":")[1] ?? id;
}

/** artifact-catalog ArtifactRead → frontend Node. */
export function artifactToNode(a: ArtifactRead): Node {
  return {
    id: a.id,
    source: "artifact-catalog",
    kind: a.kind as NodeKind,
    name: a.name,
    version: String(a.version), // int → string (MAPPING.md)
    state: a.state as LifecycleState,
    description: undefined, // backend ticket T-7 (not in catalog)
    contentHash: a.content_hash ?? undefined,
    lineageHash: a.lineage_hash ?? undefined,
    producerCodeHash: a.producer_code_hash ?? undefined,
    policyRefs: a.policy_refs.length ? a.policy_refs : undefined,
    pitConstruction: a.pit_construction ?? undefined,
    asOfKnowledgeTime: a.as_of_knowledge_time ?? undefined,
    owner: a.owner,
    createdAt: a.created_at,
    spec: a.spec,
  };
}

/** A lineage parent we only know by reference (not hydrated): a thin Node.
 *  External refs point at data-catalog (raw silver inputs); internal parent_ids
 *  are other artifacts (none exist in the current catalog, but handled). */
function parentRefToNode(e: LineageEdgeRead): { id: string; node: Node } {
  if (e.parent_external_ref) {
    const id = e.parent_external_ref.id;
    return {
      id,
      node: {
        id,
        source: "data-catalog",
        kind: "raw-dataset",
        name: id,
        spec: undefined,
      },
    };
  }
  const id = e.parent_id as string;
  return {
    id,
    node: {
      id,
      source: "artifact-catalog",
      kind: kindFromId(id),
      name: nameFromId(id),
      spec: undefined, // hydrate via getNode(id) later (T-6); thin for now
    },
  };
}

/**
 * Build a 2-level LineageSubgraph (root + its immediate parents) from the
 * single-hop /lineage walk. The recursive /subgraph endpoint is NOT used here:
 * in this catalog every parent edge is an external-ref to data-catalog, which
 * the subgraph CTE cannot traverse — so it would return the root alone. The
 * single-hop walk is where the real edges live (MAPPING.md, finding #4 + the
 * external-ref note).
 */
export function lineageHopToSubgraph(
  root: Node,
  walk: LineageWalkResult,
): LineageSubgraph {
  const nodes: Node[] = [root];
  const edges: LineageEdge[] = [];
  const seen = new Set<string>([root.id]);
  for (const e of walk.edges) {
    const { id, node } = parentRefToNode(e);
    if (!seen.has(id)) {
      seen.add(id);
      nodes.push(node);
    }
    edges.push({ childId: e.child_id, parentId: id, kind: e.edge_kind });
  }
  return { nodes, edges };
}
