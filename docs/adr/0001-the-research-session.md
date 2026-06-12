# ADR-0001 · The Research Session

> The workspace is not a place you build one answer. It is a session you iterate
> in — for hours, possibly across days — where the visualization is the output,
> every number falls through to the raw data underneath it, and the trail you
> leave is a *tree* you can fork freely without losing anything.

- **Status:** Accepted — 2026-06-11
- **Supersedes:** the "one canvas + always-on contract rail" model (Phase 2, M-I…M-N)
- **Scope:** the Invariant frontend prototype (`v1.4-dev` → Phase 3, `M-O…M-T`)
- **Companion docs:** `docs/agentic-analytics-ui-design-principles.md` (the principles),
  `docs/session-model-direction.html` (the rendered mockup), `docs/ROADMAP.md` (the milestones)

---

## Context

Phase 2 made the workspace honest and legible: a switchable canvas, the
finding-led Insight lens, plain edges, numbers-as-heroes, a `<Figure>` seam over
authored snapshots, and an always-on **contract rail** that surfaced the
invariants / validator / integrity seal. It worked — but watching real use
(and the design dialogue) exposed four things the model gets wrong:

1. **The contract rail is in the way.** The honesty machinery (pins, validator,
   seal, lineage hashes) is the *engine* that lets Invariant emit a trustworthy
   figure. Putting it in a persistent bar over every canvas reads as "compliance
   software," not "research tool." Newcomers don't know what a pin is; experts
   don't need it staring at them. It is the most important thing *underneath* and
   the wrong thing to lead with.

2. **The visualization isn't the hero yet.** The figure is the actual product of
   an agentic viz engine, but it shares the stage with text, chrome, and a graph
   diagram. The eye should land on the chart; the prose should be redundant.

3. **Trust is shown the wrong way.** We display hashes and seals to *assert*
   correctness. But the convincing form of trust is *traversal*: a number you can
   fall through — equity → the signal that made it → the spread underneath →
   the raw 1-minute bars. We built exactly one such descent (the result equity)
   and hardcoded it. It should be the universal grammar of every figure, and the
   hashes should retreat to a quiet "audit" affordance.

4. **History is a stack, and it amputates.** The dive is `useState<DiveLevel[]>`
   with `slice(0, d)` on backtrack — going back and picking a different point
   *destroys* the abandoned path. Worse, the same flaw scales up: a long research
   session is a sequence of questions, and treating it as a linear undo-stack
   means every side-track overwrites the main line. Research is not linear. The
   correct shape is a **tree**.

The user's framing of the open questions: *"the base canvas shouldn't have the
contract stuff… the visualization is the main output and needs to be much
stronger… every point can be drilled to raw… the graph still exists but is
internal… the user can iterate for a long time — when he forks a side-track, how
is it treated, what happens to the main canvas, how long can he iterate, and how
is it surfaced?"*

This ADR answers those questions as a set of binding decisions.

---

## Decisions

### D1 · The session is a tree, not a stack

The unit of state is a **session node** — a `(query, scope, view)` tuple (the
"focus" from the design principles): what was asked, over what slice, shown how.
Nodes have a parent and children.

- **Continue** grows the current branch (append a child, advance `current`).
- **Fork** branches off *any* prior node (append a sibling), and the abandoned
  path is **preserved**, never amputated. Backtracking-then-diving forks
  automatically — the old branch stays reachable, dimmed.
- The **dive** is the same tree at fine grain: equity → signal → spread → raw is
  a path; picking a different point after backtracking is a fork.

This kills the `slice(0, d)` bug at the root: there is one tree model, used for
both the macro session and the micro dive.

### D2 · The canvas is a viewport onto the current node — it travels, it never splits

There is no "main" canvas to protect. The canvas renders exactly one node: the
`current`. Navigating the tree **moves the viewport** (an object-constancy morph,
per the design principles' "trace" transition), it does not open a second canvas.
The *only* time two nodes show at once is a deliberate **compare mode** — an
explicit two-up, not an accident of forking.

So the answer to "what happens to the main canvas when I fork": nothing happens
*to* it — you simply travel to the new branch; the old branch is one click away
in the session map.

### D3 · The contract is the engine, not the chrome — strip the rail to an "audit" affordance

The persistent contract rail is removed from the canvas. Everything it enforced
**stays** — `sealOk`, the validator, the publish gate, the agentic halt — because
that is the engine. What changes is *surfacing*: a single quiet **audit**
control (carrying the seal dot: green/clay) lives in the top bar; opening it
reveals the pins / validator / lineage / vintages on demand. Hashes never sit in
your face; they are "one click away in audit, never in the viz."

The new trust surface is **D4** (drill-to-raw), not a bar of green ticks.

### D4 · Drill-to-raw is the trust surface; the "trace" is a first-class transition

Every point in every figure can dive into the representational space beneath it,
recursively, to the raw data — and this *is* the proof of honesty: "not a single
number is hidden; each traces back to the source in as many steps as it took to
build." Marks declare themselves **drillable** (they carry an authored
"underneath") or **terminal**; drillable points get the affordance, terminal ones
don't. The descent is honest by construction — authored snapshots, labeled,
never synthesized (the existing `<Figure>` discipline).

The "trace" — a number opening into the graph that made it, in *its own* space —
is recognized as a distinct interaction type alongside zoom / drill / pivot /
modal (it is the missing fifth in the design principles' depth stack).

### D5 · Two planes — a free exploration tree and a curated pinboard deliverable

Exploration and deliverable are separated, because fusing them is what makes long
sessions collapse:

- **The exploration tree** is unbounded and ephemeral-ish: wander, fork, dead-end;
  nothing is lost, nothing is "the answer."
- **The pinboard** is the curated deliverable: only **pinned** nodes become the
  report — "the morning memo, assembling itself." Forking is free; only pins
  count.

A **pin** snapshots a node `(query, scope, view)` + an annotation. It is
**orthogonal to publish**: *publish* seals a finding as a read-only citable
artifact (the existing flow); *pin* bookmarks an explorable session state. One
finding can live in many pins; one action may do both.

### D6 · Iteration is bounded by credits, not a clock

"How long can he iterate?" — effectively forever. The honest bound is **compute**:
the existing credit meter, reframed as the iteration budget ("~30 questions
left"), is the only hard ceiling. The *soft* bound is the deliverable: the
session is done when the pinboard tells the story. The UI never times you out; it
helps you see you have enough.

### D7 · One state, two drivers

The agent and the user navigate the **same** session tree. An agentic step lands
as a node on the tree the user explores by hand (tagged with its provenance). The
session map is therefore a shared surface, not a private undo log — it is how you
see "where the agent took me" and "where I went myself."

### D8 · The session map replaces the contract rail as the workspace's meta-chrome

The one persistent piece of meta-chrome is the **session map**: a small navigable
tree (trunk + branches + current node + pins + dimmed/abandoned branches with
scent). It is the honest answer to "where am I / what changed / how do I get
back," and it makes D1–D2 legible at a glance. It takes the rail's old slot.

### D9 · A node is one coherent answer — the narrative chapters live *inside* it

A session node holds **one** coherent answer. The Insight lens's five chapters
(`finding · factors · model · regime · recipe`) are that answer's *internal*
scroll-spy structure — **not** five session nodes. If a single build exploded
into five nodes, the trunk would be unreadable within minutes. The granularity of
the tree is the **question** ("does the spread revert? · by regime · sweep the
z-window"), not the section. (This is the decision all five scoping audits
assumed away; it is load-bearing.)

Corollary — **scope carries origin.** A `ScopeQuery` (the node's slice) remembers
*which* viz a brush/chip came from; two filters on the same field from different
views are different objects ("scope without provenance becomes sludge"). The scope
vocabulary is drawn from the real fixture knobs (`knobForOp`, sweeps: z-window,
regime, eval-horizon, leg), never an empty abstraction.

---

## Now vs. later (the prototype seam)

Frontend-only stays frontend-only. The interaction is fully buildable now; the
parts that need the backend are faked honestly behind `lib/data`.

| Concern | Now (prototype) | Later (backend) |
|---|---|---|
| Session tree | `lib/session/*`, persisted to `localStorage[invariant.session:{id}]`; node = `(query, scope, view)` | server-side session graph, multi-device |
| Dive "underneath" data | authored snapshots on `ResultSpec`, labeled | the real lineage engine resolves a point → its producing subgraph |
| Pinboard | `lib/pinboard-store.ts` (localStorage), mirrors `findings-store` | a pins service; shareable links |
| Persistence | auto-save debounce of canvas state per workspace | durable sessions, as-of freezing |
| Budget | the existing simulated credit counter, reframed | real metering |
| Agent-driven nodes | the scripted `runAgentic` writes nodes onto the tree | the real agent does |

The cardinal rule holds: every shape is typed to the backend contract, so the
swap is a data-source change behind one seam, not a rewrite.

---

## Consequences

**Good.** The canvas declutters to viz + a quiet audit. Trust becomes something
you *do* (fall through a number), not something you read (a hash). Side-tracks are
free and lossless, so the tool supports a real multi-hour research session. The
pinboard gives the session a destination. The same tree model powers both the
dive and the session, deleting the `slice(0, d)` amputation bug.

**Costs / risks.** Hoisting dive state to a tree in `workspace-client` touches the
hottest component; we mitigate with a context so the whole canvas doesn't
re-render per dive. A long session's tree can grow unnavigable — mitigated by
scent on stale branches, the pinboard spine, and collapse. Deep dive paths blow
past URL length — mitigated by storing the tree in `localStorage` and encoding a
short delta in the URL. Removing the always-on rail must **not** weaken the
publish gate or the agentic halt — both stay wired to the same `sealOk`/validator;
only their *surfacing* moves to the audit affordance. Two card-grids
(pins vs published findings) risk confusion — kept distinct: "saved views" vs
"published results."

**Explicitly out of scope (until needed):** real multi-user sessions, server
persistence, as-of time-travel made real, collaborative pinboards.

---

## Alternatives considered

- **Keep the rail, just collapse it harder.** Rejected: the problem is *leading
  with the machinery*, not its height. Demotion to on-demand audit is the point.
- **History as a linear stack with undo/redo.** Rejected: this is the bug, scaled
  up. Research forks; a stack amputates.
- **Split the canvas on fork (two panes).** Rejected: violates object-constancy
  and overwhelms. Comparison is a *deliberate* mode (D2), not a side effect.
- **A hard iteration cap / session timer.** Rejected: dishonest and arbitrary;
  the real bound is compute (D6).
- **Make every mark drillable.** Rejected: some marks have no point identity
  (feature weights, regime segments). Marks *declare* drillable vs terminal (D4).
