import type { SessionTree, SessionNode, DiveSpace } from "@/lib/types";

/**
 * The session TREE — pure, immutable operations over a tree of (query, scope,
 * view) nodes (ADR-0001 · D1). This is the single source of truth shared by the
 * macro session and the micro dive (one model, two drivers). The cardinal move:
 * `fork` / `addChild` are NON-DESTRUCTIVE — backtracking then diving elsewhere
 * keeps the abandoned branch in `nodes`, reachable. This is the inverse of the
 * old `diveStack.slice(0, d)` amputation that silently destroyed forward history.
 *
 * Every mutator returns a NEW tree (new `nodes` map) so React state updates are
 * clean. Node ids come from a deterministic module counter (no Date/Math.random
 * → SSR-safe and unit-testable); `reseedNodeIds` lifts the counter past a loaded
 * tree so restored sessions never collide with new nodes.
 */

let _counter = 0;
function newNodeId(): string {
  return "sn" + (++_counter).toString(36);
}

/** Lift the id counter past every numeric id in a (restored) tree. */
export function reseedNodeIds(tree: SessionTree): void {
  for (const id of Object.keys(tree.nodes)) {
    const n = parseInt(id.replace(/^sn/, ""), 36);
    if (!Number.isNaN(n) && n > _counter) _counter = n;
  }
}

type NodeData = Omit<SessionNode, "id" | "parentId">;

/** A fresh tree rooted at one node (the current finding / first question). */
export function initSessionTree(root: NodeData): SessionTree {
  const id = newNodeId();
  const node: SessionNode = { ...root, id, parentId: null };
  return { rootId: id, currentId: id, nodes: { [id]: node } };
}

export function nodeById(tree: SessionTree, id: string): SessionNode | undefined {
  return tree.nodes[id];
}

export function currentNode(tree: SessionTree): SessionNode {
  return tree.nodes[tree.currentId];
}

/** Append a child of `parentId` and move the cursor onto it (continue/fork —
 *  the call is the same; whether it's a continue or a fork is just whether the
 *  parent already had children). Never removes a sibling. */
export function addChild(tree: SessionTree, parentId: string, data: NodeData): SessionTree {
  if (!tree.nodes[parentId]) return tree;
  const id = newNodeId();
  const node: SessionNode = { ...data, id, parentId };
  return { ...tree, currentId: id, nodes: { ...tree.nodes, [id]: node } };
}

/** Append a child of `parentId` WITHOUT moving the cursor — for nodes the agent
 *  lands on the tree while the user is parked elsewhere (e.g. an agentic run),
 *  so "where the agent took me" appears in the map without yanking the viewport. */
export function addChildKeepCursor(tree: SessionTree, parentId: string, data: NodeData): SessionTree {
  if (!tree.nodes[parentId]) return tree;
  const id = newNodeId();
  const node: SessionNode = { ...data, id, parentId };
  return { ...tree, nodes: { ...tree.nodes, [id]: node } };
}

/** Move the cursor to an existing node (back, branch-switch, map travel) —
 *  WITHOUT removing anything. The thing the stack model got wrong. */
export function navigate(tree: SessionTree, id: string): SessionTree {
  if (!tree.nodes[id] || id === tree.currentId) return tree.nodes[id] ? { ...tree, currentId: id } : tree;
  return { ...tree, currentId: id };
}

/** The children of a node, in insertion order. */
export function childrenOf(tree: SessionTree, id: string): SessionNode[] {
  return Object.values(tree.nodes).filter((n) => n.parentId === id);
}

/** Root → node, inclusive — the active path the canvas/cascade renders. The
 *  `seen` guard means a corrupt (cyclic) restored tree degrades instead of
 *  hanging the render thread. */
export function pathTo(tree: SessionTree, id: string): SessionNode[] {
  const out: SessionNode[] = [];
  const seen = new Set<string>();
  let cur: SessionNode | undefined = tree.nodes[id];
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    out.unshift(cur);
    cur = cur.parentId ? tree.nodes[cur.parentId] : undefined;
  }
  return out;
}

/**
 * Dive from `parentId` into a representational space at `index`. If a child for
 * exactly that (space, index) already exists, just navigate to it (no dup);
 * otherwise FORK a new dive child — leaving any existing sibling branch intact.
 * This is the dive-as-tree: backtrack + pick a different point → a new branch,
 * old branch preserved.
 */
export function diveTo(
  tree: SessionTree,
  parentId: string,
  space: DiveSpace,
  index: number,
  data: Omit<NodeData, "view"> & { view?: Partial<SessionNode["view"]> },
): SessionTree {
  const parent = tree.nodes[parentId];
  if (!parent) return tree;
  const existing = childrenOf(tree, parentId).find((c) => c.view.dive?.space === space && c.view.dive?.index === index);
  if (existing) return navigate(tree, existing.id);
  const view = { lens: parent.view.lens, ...(data.view ?? {}), dive: { space, index } };
  return addChild(tree, parentId, { ...data, view });
}

/** Pin / unpin a node — the curated deliverable (ADR D5). Non-structural. */
export function pin(tree: SessionTree, id: string, annotation?: string): SessionTree {
  const n = tree.nodes[id];
  if (!n) return tree;
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...n, pinned: true, annotation: annotation ?? n.annotation } } };
}
export function unpin(tree: SessionTree, id: string): SessionTree {
  const n = tree.nodes[id];
  if (!n) return tree;
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...n, pinned: false } } };
}
/** Pinned nodes in tree (pre-order) order — the memo assembling itself. */
export function pinnedNodes(tree: SessionTree): SessionNode[] {
  const out: SessionNode[] = [];
  const walk = (id: string) => {
    const n = tree.nodes[id];
    if (!n) return;
    if (n.pinned) out.push(n);
    for (const c of childrenOf(tree, id)) walk(c.id);
  };
  walk(tree.rootId);
  return out;
}

/** Count of distinct branches under a node (>1 ⇒ a fork happened here). */
export function branchCount(tree: SessionTree, id: string): number {
  return childrenOf(tree, id).length;
}

/** The QUESTION node you're standing in — walk up past dive levels to the nearest
 *  node with no `view.dive` (a real question/answer, not a trace level). Questions
 *  are the trunk the session map draws; dives hang beneath their question. */
export function questionAncestor(tree: SessionTree, id: string): string {
  const seen = new Set<string>();
  let cur: SessionNode | undefined = tree.nodes[id];
  while (cur && cur.view.dive && cur.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    cur = tree.nodes[cur.parentId];
  }
  return cur ? cur.id : tree.rootId;
}

/** Every question node (no dive) — the navigable session spine. */
export function questionNodes(tree: SessionTree): SessionNode[] {
  return Object.values(tree.nodes).filter((n) => !n.view.dive);
}

/** Question nodes in pre-order (root → children, depth-first) — the order j/k
 *  walk through with the keyboard. */
export function orderedQuestionNodes(tree: SessionTree): SessionNode[] {
  const out: SessionNode[] = [];
  const walk = (id: string) => {
    const n = tree.nodes[id];
    if (!n) return;
    if (!n.view.dive) out.push(n);
    for (const ch of childrenOf(tree, id)) walk(ch.id);
  };
  walk(tree.rootId);
  return out;
}

/** How many dive levels hang beneath a question (its trace depth, any branch). */
export function diveDepthUnder(tree: SessionTree, id: string): number {
  let max = 0;
  const walk = (nid: string, d: number) => {
    for (const c of childrenOf(tree, nid)) if (c.view.dive) { max = Math.max(max, d + 1); walk(c.id, d + 1); }
  };
  walk(id, 0);
  return max;
}

/* ── URL serialization of depth (ADR D1; used by the deep-link in M-T) ─────────
   A deep dive path can blow past URL length, so the URL carries only the current
   node id; the full tree lives in localStorage and resolves it on restore. */
export function encodeCurrent(tree: SessionTree): string {
  return tree.currentId;
}
export function decodeCurrent(tree: SessionTree, encoded: string): SessionTree {
  return tree.nodes[encoded] ? navigate(tree, encoded) : tree;
}
