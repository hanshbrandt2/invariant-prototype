import type { SessionTree } from "@/lib/types";
import { reseedNodeIds } from "@/lib/session-tree";

/**
 * The session store — where a research session actually persists in the frontend
 * prototype: the browser's localStorage, keyed per workspace. A session survives
 * reload and navigation (closing the laptop and resuming at the exact node is the
 * whole point — losing two hours of forks is the betrayal the tree exists to
 * prevent). When a backend lands this swaps for a session service behind the same
 * calls — one seam. Server calls are safe no-ops (guarded on `window`).
 *
 * NOTE (M-T): a long session must delta-store rather than snapshot full graphs
 * per node to stay under the ~5MB quota; the SessionNode shape is deliberately
 * light (query + scope + view, not materialized data) so this stays cheap.
 */
const KEY = (workspaceId: string) => `invariant.session:${workspaceId}`;

export function loadSession(workspaceId: string): SessionTree | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY(workspaceId));
    if (!raw) return null;
    const tree = JSON.parse(raw) as SessionTree;
    // root + cursor must resolve to real nodes — a partial/corrupt payload
    // (e.g. {nodes:{}}) falls through to a clean re-seed, not a poisoned tree.
    if (!tree?.nodes || !tree.nodes[tree.rootId] || !tree.nodes[tree.currentId]) return null;
    reseedNodeIds(tree); // never collide restored ids with new ones
    return tree;
  } catch {
    return null;
  }
}

export function saveSession(workspaceId: string, tree: SessionTree): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY(workspaceId), JSON.stringify(tree));
  } catch {
    /* quota / private mode — fail soft (M-T will delta-store) */
  }
}

export function clearSession(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY(workspaceId));
  } catch {
    /* ignore */
  }
}
