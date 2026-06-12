# Designing an Agentic Analytics UI — First Principles

A consolidated reference covering visual hierarchy, agent-chat placement, the depth (z) axis, the multi-step drill-down interaction model for a multi-visualization canvas, the layout policy that scales the canvas from 1 to 50 views, and the state model that makes hours-long analytical sessions possible.

---

## 1. The governing first principle

A screen is a market for attention. Attention is the scarce resource being allocated, and the layout is the price mechanism: size, contrast, position, and motion are the bids. If everything bids loudly, there is no signal — the visual equivalent of a crowded trade.

The foundational rule that follows: **every screen has exactly one primary instrument** — the thing whose state changes and demands decisions. Like a trading desk, the center monitor carries the live decision surface (positions, the order book); news, chat, and analytics sit peripheral. The eye should land on the primary instrument in under one second, unaided. Everything else earns its place by frequency × urgency: high-frequency, high-urgency information stays large and central; everything else moves to the edges or into depth.

The cold-open test for any screen, three questions:

1. *What's the most important thing right now?* Hierarchy works if a new user answers in one second.
2. *What did the agent just change?* The canvas, not the chat transcript, should answer this.
3. *How do I get back?* Depth works if the answer is always one obvious gesture.

Fail any of the three and you know which axis to fix.

---

## 2. Visual hierarchy — three levels deep

### Level 1: One focal point
One primary instrument per screen. Salience allocated by frequency × urgency.

### Level 2: Pre-attentive processing
Before a user reads anything, the visual cortex processes certain channels in roughly 200 ms, involuntarily: motion, color, contrast, size, position. You are designing for the pre-reader, not the reader. The channels have a strict salience ordering — **motion beats color beats contrast beats size beats position** — and that ordering is your cost-of-capital schedule. Motion is the most expensive instrument you can issue; spend it only on state changes that demand action now. A trading UI where every tick flashes has issued so much motion that motion trades at par with silence — that is alarm fatigue, the visual equivalent of crying-wolf signal decay.

There is a complementary ordering for accuracy (Cleveland & McGill): position and length are read precisely; area and color only coarsely. So encode magnitudes in position and length, encode categories and states in color — never the reverse.

### Level 3: Design the resting state; guarantee layout stability
Since *change* is the strongest pre-attentive signal, the highest-leverage move is making the resting state maximally quiet: muted grays, two font weights, three type sizes, one accent color held in reserve. Deltas then pop for free. (Partly why trading terminals are dark: a flat dark baseline gives contrast headroom to spend on what moved.)

Gestalt principles do the chunking work that explicit boxes otherwise would — proximity is the strongest grouping cue, stronger than similarity, stronger than enclosure — so whitespace and alignment replace most borders and containers, lowering the ambient noise floor further.

The frequently missed precondition: **layout stability**. The eye tracks change by position; if updating data causes reflow — columns shifting, rows jumping — pre-attentive tracking is destroyed entirely. Fixed-width numerals, reserved space for variable-length values, zero layout shift on update. A ticker that jitters is a ticker you can't read, regardless of hierarchy.

---

## 3. Placing the agent chat — three levels deep

### Level 1: Who owns the state?
- If the user's work product is a **persistent artifact** (dashboard, portfolio, document, model), the artifact owns the canvas and the chat is a collaborator — a collapsible side rail (typically right; left is conventionally navigation). Like the Bloomberg IB window next to the execution screen.
- When the agent acts, **the effects must appear on the canvas, not in the transcript** — highlighted diffs, annotated cells, a changed chart. Chat is where intent is expressed; the canvas is where truth lives.
- If the **conversation itself is the deliverable** (research, exploration, Q&A), invert it: chat takes center, artifacts embed inline.
- Third pattern: **ambient invocation** — a command palette (Cmd+K) that summons and dismisses the agent; best for episodic rather than continuous use.

Most teams default chat to center because the AI feels like the product. From the user's perspective the AI is an execution venue — and nobody stares at the venue; they stare at their book.

### Level 2: Agent actions are staged transactions
The deep problem is trust mechanics, not placement. The right mental model is database transactions with a risk-limit overlay. Every agent action moves through a lifecycle — **intent → plan → proposal → commit → verification** — and the design question is where in that lifecycle the human gate sits, varying by action class exactly like trading mandates vary by risk:

| Tier | Action class | Gate |
|---|---|---|
| 1 | Read and analyze | No gate — acts freely (the analyst can read anything) |
| 2 | Reversible writes | Auto-commit with a visible undo window (trade within limits; every fill on the tape) |
| 3 | Irreversible actions | Human confirmation **before** commit (exceeding risk limits requires sign-off) |

The UI's job is to make the tier of a pending action legible *before* it happens. The pipeline on screen: intent captured in the chat rail → proposal rendered as a diff overlay on the canvas → commit updates the canvas → provenance recorded (audit + undo).

### Level 3: Diff grammar, concurrency, promotion
Three mechanisms most teams skip:

1. **A consistent diff grammar.** One visual vocabulary for agent-touched state used identically everywhere: additions, modifications, and removals each get exactly one encoding (a tint, a strikethrough, a margin marker). "Agent-modified, not yet human-verified" is itself a visible state that decays after acknowledgment. If diffs render differently in tables vs charts vs text, the user must re-learn the grammar per surface and verification cost explodes.
2. **Concurrency policy.** The agent works asynchronously, so the user will eventually edit an object the agent is mid-edit on. You need an explicit policy — soft locks ("agent is working here" shimmer on the affected region), or optimistic merge with a conflict diff — plus interruptibility: a visible working/blocked/done status and a cancel that actually aborts. An uninterruptible agent is an uncancelable order.
3. **Promotion.** Chat transcripts are the tape: append-only, high-volume, decaying relevance. Decisions and artifacts must be promoted out of the transcript onto the canvas (pinned, saved, materialized) — anything that lives only in scrollback is functionally lost. Rule: ephemeral answers render in the rail; durable state changes render on the canvas; nothing important lives only in the conversation.

Provenance everywhere: every agent-made artifact is tagged with the prompt/run that produced it, clickable back to the reasoning.

---

## 4. The depth (z) axis — three levels deep

### Level 1: Depth is deferred detail
Each layer down trades context for resolution. The canonical formulation is Shneiderman's mantra: **overview first, zoom and filter, then details on demand.** Surface shows L1 (top-of-book, aggregate P&L); one interaction down is L2 (full depth of book, position breakdown); deeper still is the raw tape.

Governing principles:
- **Depth allocation follows the inverse of urgency**: needed every minute → depth zero; configured quarterly → four layers down.
- **Descending must be cheap and reversible**: breadcrumbs, escape hatches, persistent "where am I" context. Users tolerate depth; they don't tolerate getting lost in it. That's navigation debt, and it compounds.
- **Prefer in-place expansion over modals**: drill-down panes, expanding rows, detail drawers. A modal freezes the entire world to show one thing — a market halt. Justified for destructive confirmations; toxic as a default.
- **Z-order carries temporal meaning**: whatever floats on top reads as *now*. Reserve the topmost layer for genuine urgency or it loses signaling power.
- **Each deeper layer should be narrower in scope than its parent** — "everything about the thing you just selected," not "more of everything." If a deeper layer is broader than its parent, the information architecture is inverted.
- **The agent is a depth-flattening device.** It can dive into depth and surface a layer-four fact at layer zero ("show me the three positions driving today's drawdown" replaces four clicks of drill-down). This lets the surface be leaner — but imposes a symmetry requirement: whatever the agent surfaces must carry provenance, a one-click path back to the layer it came from, so the user can verify rather than trust.

### Level 2: Depth is a typed stack; the URL is its serialization
Not all descents are the same operation. Four transition types:

| Transition | Meaning | Navigation semantics |
|---|---|---|
| **Zoom** | Same object, finer resolution (daily chart → tick chart) | Composes into a stack; wants breadcrumbs |
| **Drill** | Parent → child entity (portfolio → position → fill) | Composes into a stack; wants breadcrumbs |
| **Pivot** | Same data, rotated dimension (P&L by desk vs by instrument) | Lateral, not deeper; wants a visible "current dimension" indicator |
| **Modal** | A different task entirely | Wants an explicit exit; should be rare |

Architectural consequence: **the entire stack state serializes into the route/URL.** Depth that can't be deep-linked can't be shared, bookmarked, restored after refresh, or emitted by the agent as a provenance link. The URL is the API of depth. And "back" must pop the stack deterministically — an unpredictable back button is the fastest way to make depth feel hostile.

### Level 3: Information scent and the peek economy
Why does a user descend at all? Information foraging theory (Pirolli & Card): users behave like foragers maximizing information gained per unit cost, descending only when the *scent* at the current layer predicts payoff below.

- **Every element that hides depth must leak a compressed preview** of what's beneath: a sparkline on a portfolio row, a count badge on a category, a one-line summary on a collapsed section. No scent, no descent.
- **Each full descent costs** a click + load + reorientation (~2–5 seconds of cognitive context switch). Provide **peek mechanisms** — hover cards, expandable rows, side-peek panels — that let users sample depth without paying the full navigation cost or losing their place. It's checking L2 depth without lifting your working order.
- **Kill pogo-sticking** (down into sibling A, back up, down into sibling B to compare). Solve it at the parent level with side-by-side comparison — never by making the children faster to bounce between.
- **The agent's synthetic breadcrumb**: when the agent flattens the stack and surfaces a deep fact at the surface, it must attach the deep link to where that fact lives, so verification costs one click. An agent answer without a path back is an unverifiable mark; with provenance, it's a mark-to-market you can audit.

---

## 5. The multi-step interaction model — five visualizations, hours of drilling

**The setup:** the nav is where the user poses/selects questions; the canvas answers with a set of coordinated visualizations (~5 in this walkthrough; the count varies with task complexity — see Section 6). The user must be able to descend into any one of them without losing the others, repeatedly, for hours. Two principles govern everything: *context is never destroyed, only compressed*, and *a long session produces a path that is itself an artifact*.

### Step 0 — The answer state
The question renders five visualizations in a grid. This grid is layer zero: each viz is simultaneously an answer and a scent-emitter for what's beneath it.

### Step 1 — Interrogate in place (zero navigation cost)
- Hovering reveals values (peek).
- Brushing a range or clicking a segment in one viz **cross-filters the other four** (linked brushing across coordinated views).
- This is a *lateral* move, not a descent: depth unchanged, scope narrowed, all five views still visible.
- **Critical gesture separation: interacting inside a viz filters; an explicit expand affordance promotes.** Overload one click with both meanings and users accidentally navigate when they meant to filter — the most common failure in these tools.

### Step 2 — Promotion: the canvas morphs, it doesn't switch
The user expands viz #3. Layout transitions to **focus + filmstrip**: #3 grows to occupy the canvas; the other four shrink into a live thumbnail strip. Two hard rules:

1. **Object constancy**: the chosen viz visibly travels and grows in a ~250 ms animation — never teleports to a "new page." The mental model must be "the same room rearranged," not "a different room."
2. **The filmstrip stays live**: the four thumbnails keep rendering real data under the current scope — they are context, not history. Clicking any thumbnail swaps focus without losing state; sideways movement at the same depth is one click.

### Step 3 — Drilling inside the focus
The user selects a segment of the focused chart (a desk, a date range, an instrument bucket) and drills. Three things happen simultaneously:

1. A **scope chip** appears in a persistent bar ("Desk: EU rates ×"), removable independently of navigation.
2. The **breadcrumb** grows one node.
3. **The filmstrip follows scope**: the four thumbnails now show their views *of the drilled subset*. The user is always looking at one coherent question — "this scope, five ways" — never a Frankenstein of mixed scopes. This is the difference between coordinated views and five unrelated charts sharing a screen.

### Step 4 — Pinning: insight promoted out of the flow
The user finds something. They pin it: a snapshot of the **full state** (viz config + scope chips + breadcrumb position + a one-line annotation) goes to a persistent board. Pinning makes hours-long exploration psychologically safe — once checkpointed, the user can mutate the live canvas freely. Diagnostic: if users hoard browser tabs and screenshots, this feature is missing.

### Step 5 — Backtracking and branching: history is a tree, not a stack
The breadcrumb (or history rail) lets the user jump to any prior node. Critical rule: **going back is non-destructive.** Drilling again from an earlier node *forks a branch*; the abandoned path remains reachable. A plain stack silently amputates forward history on every backtrack — over hours, it destroys exactly the comparisons the user was building toward. The session becomes a **tree of analytical states**, each a (scope, focus, viz-config) tuple, each serialized into the URL so any node is shareable and restorable.

### Step 6 — The hours-long regime
Three more mechanisms become load-bearing:

1. **Comparison mode**: when two branches both produced pinned states, view them side by side at the parent level — split the focus area into two synced panes sharing one axis scale. Never force comparing from memory across a navigation gap.
2. **Persistence**: the whole tree auto-saves continuously; closing the laptop and reopening tomorrow restores the exact node, scope chips and all. An analyst who loses two hours of drilling once never trusts the tool again — same reason you never trust a blotter that drops fills.
3. **The deliverable**: by hour three, the pinboard — annotated snapshots in sequence — has quietly become the output: the morning-meeting narrative, the memo. Exploration and reporting are not separate tools; the trail of pins *is* the report draft.

### The agent threaded through every step
- **Step 1**: answers "why did this spike?" about the *current scope* — it always reads the same scope chips the user sees, so they're never talking about different data.
- **Step 3**: suggests the next cut ("residual variance is concentrated in two books — decompose?") — information scent generated on demand.
- **Step 5**: can *jump* the user to a state ("show me this same view for Q3") by forking a node programmatically, with the synthetic breadcrumb attached so the jump is auditable.
- The agent never gets a private view of the data; it manipulates the same state tree the user navigates by hand. **One state model, two drivers.**

### The complete interaction grammar — six verbs
> **Brush to filter · click to expand · chip to scope · pin to keep · breadcrumb to return · fork to compare.**

Six verbs, which is why it survives hours of use. Everything else is the canvas morphing smoothly enough that the user never asks "where am I?" — the answer is always written in the scope bar and the trail.

---

## 6. The canvas scales — layout is a policy function of N

**The number of visualizations is an output of the question, not a design constant.** A simple question may need one view; a complex task may need fifty. But the tension that must be resolved: the answer's complexity scales freely, while the human's perceptual budget doesn't. Working memory holds roughly four chunks; coordinated views stay comprehensible up to about five to seven. So when N grows, the canvas can't just add cells — **the grid itself becomes subject to the same depth rules as everything else.**

### The layout policy by N

| N | Layout regime |
|---|---|
| **1** | Skip the grid — render the focus layout immediately, full canvas, no filmstrip of siblings. The filmstrip slot can instead show agent-suggested *related* views: scent for lateral moves the user hasn't asked for yet. |
| **2–3** | A row, with shared axes where possible. |
| **4–9** | The coordinated grid — the comfortable regime ("5-viz" was the working example of this band). |
| **10–50** | The policy changes in kind, not degree — see faceting vs aspect below. |

### Faceting vs aspect — the critical distinction at large N

- **Multiplicity by faceting** — the same chart template repeated across a dimension (fifty instruments' sparklines, one P&L curve per desk) — **scales beautifully as small multiples**, because homogeneous repetition reads perceptually as *one* visualization with fifty data points. The eye compares; it doesn't enumerate.
- **Multiplicity by aspect** — fifty genuinely different charts answering different sub-questions — **does not scale at all.** That's fifty separate reads; chaos at any size.

When the answer is genuinely heterogeneous and large, the system must **hierarchize the answer set itself**: group views into themed sections, lead with the three to five that answer the question most directly, and demote the rest into collapsed groups that leak scent (a title, a sparkline thumbnail, an anomaly badge). The canvas becomes a **portfolio of views**, and screen space is allocated like capital — position size proportional to expected information value, with the agent doing the ranking. A fifty-view answer with all fifty at depth zero isn't completeness; it's a refusal to prioritize, pushed onto the user.

### The invariance test

**The six-verb grammar must be invariant under N.** Brush, expand, chip, pin, breadcrumb, fork work identically whether the answer rendered one view or fifty — expanding a small-multiple facet promotes it to focus exactly like expanding cell #3 of a five-grid, and the remaining forty-nine compress into the filmstrip (or its grouped equivalent). If the user has to learn different interactions for different answer sizes, the layout policy has leaked into the grammar — and that's the bug. **N changes what the canvas shows; it must never change what the user does.**

---

## 7. What a focus node captures in the history tree

A focus node is a *trade ticket plus the market context at execution*: everything needed to reconstruct not just what you were looking at, but what it meant at that moment. Four layers, in descending order of semantic weight:

### Query state — what was asked
Dataset, measures, dimensions, aggregation grain (daily P&L by desk vs tick-level by instrument). The part that survives a UI redesign — it describes the question, not the pixels. Includes a **data as-of reference** (see below).

### Scope state — chips and brushes, with origin
Every chip, brushed range, and cross-filter selection — and crucially, the *origin* of each. A brush created in the distribution chart must remember it came from there, because removing that chip must un-highlight the source viz, and because two filters on the same field from different views are different objects, not a merged condition. Scope without provenance becomes unremovable sludge by hour two.

### View state — layout and encodings
Which of the five viz holds focus, filmstrip order, and the focused chart's configuration: chart type, encodings, axis scales (log vs linear changes what an insight even *was*), sort order, zoom window, color mapping. A pinned insight restored with a different axis scale is a different claim.

### Lineage state — parent, delta, actor
Parent pointer, the **delta** (the single action that produced the node — "drilled desk = EU"), timestamp, and the **actor** — user or agent, and if agent, the prompt that generated it. The actor field is the audit trail for free: when a number in the morning memo gets challenged, trace it to "agent fork, 14:32, from prompt X."

### Three implementation decisions
1. **Store deltas, materialize snapshots.** Persist each node as parent + delta (event sourcing); reconstruct full state by replaying from the root. Nodes stay tiny, the audit trail is inherent rather than bolted on, and materialized states can be cached for frequently revisited nodes.
2. **Exclude ephemera.** Hover position, tooltip visibility, scroll offset — anything that doesn't change the analytical claim — is deliberately not captured. The test: would two analysts agree the state is "the same" if this field differed? If yes, drop it.
3. **As-of semantics.** A node restored next week against live data may show different numbers — late fills, restated marks, revised reference data. That's re-marking a book, and the node must be explicit about which regime it's in. Clean policy: ordinary tree nodes **re-run live by default** (the question is durable, the answer refreshes); **pinned** nodes additionally **freeze the result** — storing both the query and the materialized data snapshot — with a visible badge when live re-execution disagrees with the frozen capture. That disagreement badge is itself an insight surface: "this conclusion no longer holds against current data" is exactly what an analyst needs shoved in their face.

**Compact definition:** a focus node is *(query, scope, view, lineage)* — fully serializable, URL-addressable, delta-stored, ephemera-free, with explicit as-of semantics. Get that tuple right and everything downstream — pins, forks, comparison, agent provenance, session restore — is just operations on it.

---

## 8. The unifying thread

Every design decision in this document is an **allocation under scarcity** — of salience, of trust, of navigation effort. The good designs price those resources explicitly instead of letting them inflate:

- Hierarchy prices *attention* (one primary instrument; motion as the most expensive channel; quiet resting state so deltas are free).
- Agent design prices *trust* (autonomy tiers as risk limits; staged transactions; provenance as the audit trail).
- Depth prices *effort* (frequency × urgency allocation; scent before descent; peeks before commits; reversibility always).
- The layout policy prices *perception* (the answer scales freely, the perceptual budget doesn't; screen space allocated like capital, position size ∝ information value).
- The session model prices *memory* (the tree remembers so the user doesn't; pins checkpoint; the trail becomes the deliverable).
