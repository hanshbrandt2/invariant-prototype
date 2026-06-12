// Verify-by-execution (memory: prove it runs, never just claim it) for the
// SessionTree model (M-P). Run: node --experimental-strip-types scripts/verify-session-tree.ts
// Type-only imports are stripped by node, so the @/lib/types specifier is never resolved.
import {
  initSessionTree,
  diveTo,
  navigate,
  addChildKeepCursor,
  childrenOf,
  pathTo,
  pinnedNodes,
  pin,
  branchCount,
  encodeCurrent,
  decodeCurrent,
} from "../lib/session-tree.ts";

let failures = 0;
function ok(cond: boolean, msg: string) {
  if (cond) console.log("  ✓ " + msg);
  else { console.error("  ✗ " + msg); failures++; }
}

const now = "2026-06-11T00:00:00.000Z";
const base = { actor: "user" as const, query: "q", scope: [], createdAt: now };

// root = the finding
let t = initSessionTree({ ...base, delta: "the finding", view: { lens: "result" } });
const root = t.rootId;
ok(t.currentId === root, "root is current at init");

// dive: return → signal[0] → spread[3] → raw[5]
t = diveTo(t, root, "signal", 0, { ...base, delta: "signal 0" });
const sig0 = t.currentId;
t = diveTo(t, sig0, "spread", 3, { ...base, delta: "spread 3" });
const spr3 = t.currentId;
t = diveTo(t, spr3, "raw", 5, { ...base, delta: "raw 5" });
const raw5 = t.currentId;
ok(pathTo(t, raw5).length === 4, "dive path is 4 deep (return→signal→spread→raw)");
ok(pathTo(t, raw5).map((n) => n.view.dive?.space ?? "return").join(">") === "return>signal>spread>raw", "path spaces in order");

// THE BUG THIS REPLACES: backtrack to signal, dive a DIFFERENT spread → FORK.
t = navigate(t, sig0);
ok(t.currentId === sig0, "navigate back to signal does not amputate (cursor moved only)");
ok(!!t.nodes[raw5] && !!t.nodes[spr3], "the deep branch (spread3→raw5) still exists after backtracking");
t = diveTo(t, sig0, "spread", 7, { ...base, delta: "spread 7" });
const spr7 = t.currentId;
ok(spr7 !== spr3, "diving a different point created a NEW node (fork)");
ok(branchCount(t, sig0) === 2, "signal now has 2 branches (old + new), nothing lost");
ok(childrenOf(t, sig0).some((c) => c.id === spr3) && childrenOf(t, sig0).some((c) => c.id === spr7), "both branches reachable from signal");

// diving the SAME point twice navigates (no duplicate)
const before = Object.keys(t.nodes).length;
t = diveTo(t, sig0, "spread", 7, { ...base, delta: "spread 7 again" });
ok(Object.keys(t.nodes).length === before && t.currentId === spr7, "re-diving the same point navigates, no duplicate node");

// pins → the deliverable
t = pin(t, spr7, "the gas leg trends, doesn't revert");
ok(pinnedNodes(t).length === 1 && pinnedNodes(t)[0].id === spr7, "pin surfaces in pinnedNodes");

// addChildKeepCursor (the agentic-node fix): lands a node WITHOUT moving the cursor
const beforeCursor = t.currentId;
t = addChildKeepCursor(t, t.rootId, { ...base, delta: "agent node", view: { lens: "result" } });
ok(t.currentId === beforeCursor, "addChildKeepCursor adds a node without moving the cursor");
ok(childrenOf(t, t.rootId).some((c) => c.delta === "agent node"), "the kept-cursor node is in the tree");

// cycle guard (the corrupt-restored-tree fix): pathTo terminates, doesn't hang.
// Build via the typed API, then inject a parent cycle (root → its own child).
let poisoned = initSessionTree({ ...base, delta: "a", view: { lens: "result" } });
poisoned = addChildKeepCursor(poisoned, poisoned.rootId, { ...base, delta: "b", view: { lens: "result" } });
const childId = Object.keys(poisoned.nodes).find((x) => x !== poisoned.rootId);
poisoned.nodes[poisoned.rootId].parentId = childId ?? null; // root.parent → child → root
ok(pathTo(poisoned, poisoned.rootId).length <= 2, "pathTo terminates on a cyclic tree (no hang)");

// round-trip: save → load → identity; encode/decode current is identity
const round = JSON.parse(JSON.stringify(t));
ok(JSON.stringify(round) === JSON.stringify(t), "JSON round-trip is identity");
ok(decodeCurrent(t, encodeCurrent(t)).currentId === t.currentId, "encode/decode current is identity");

console.log(failures === 0 ? "\n✓ session-tree: all assertions pass" : `\n✗ session-tree: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
