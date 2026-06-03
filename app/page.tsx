import { Reveal } from "@/components/landing/reveal";
import { Fig1 } from "@/components/landing/fig1";

export default function Home() {
  return (
    <div className="font-sans">
      <SiteNav />
      <Dateline />
      <main>
        <Hero />
        <Pillars />
        <Specimen />
        <Arc />
        <CtaBand />
      </main>
      <Colophon />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Masthead nav                                                     */
/* ────────────────────────────────────────────────────────────── */
function SiteNav() {
  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur-sm border-b border-ink">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10">
        <div className="flex items-center justify-between h-16">
          <a href="#top" className="flex items-baseline gap-2.5 group">
            <span className="inline-block h-2.5 w-2.5 bg-clay translate-y-[-1px]" />
            <span className="font-serif text-[1.5rem] font-semibold tracking-[-0.01em] leading-none">
              Invariant
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-8">
            {[
              ["Provenance", "#provenance"],
              ["Lineage", "#lineage"],
              ["Policies", "#policies"],
              ["The arc", "#arc"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-[0.82rem] text-ink-2 hover:text-clay transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href="#enter"
            className="font-mono text-[0.72rem] uppercase tracking-[0.14em] border border-ink px-3.5 py-2 hover:bg-ink hover:text-paper transition-colors"
          >
            Enter workspace
          </a>
        </div>
      </div>
    </header>
  );
}

/* Dateline strip — masthead metadata */
function Dateline() {
  return (
    <div className="border-b border-hairline bg-paper">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10">
        <div className="flex items-center justify-between py-2 eyebrow">
          <span>A workspace for quantitative research</span>
          <span className="hidden sm:inline">Point-in-time by construction</span>
          <span>Vol. 01 · No. 1</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Hero                                                             */
/* ────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section id="top" className="border-b border-hairline">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-14 pt-16 md:pt-24 pb-14">
          <div className="lg:col-span-7">
            <p className="eyebrow rise" style={{ animationDelay: "0ms" }}>
              The research graph, made honest
            </p>
            <h1
              className="rise mt-6 font-serif font-semibold text-ink leading-[0.98] tracking-[-0.02em] text-[2.9rem] sm:text-[3.9rem] lg:text-[4.4rem]"
              style={{ animationDelay: "80ms" }}
            >
              Every result
              <br />
              remembers <span className="italic font-normal text-clay">how</span>
              <br />
              it was built.
            </h1>
          </div>
          <div className="lg:col-span-5 lg:pt-3">
            <p
              className="rise dropcap font-serif text-[1.18rem] leading-[1.62] text-ink-2"
              style={{ animationDelay: "180ms" }}
            >
              Invariant is a workspace where data, features, models and results
              live in one connected graph — each artifact carrying its lineage,
              its content hash, and the policies it must obey.
            </p>
            <p
              className="rise mt-5 text-[0.95rem] leading-[1.7] text-muted"
              style={{ animationDelay: "260ms" }}
            >
              No lookahead. No silent roll. No result you can&rsquo;t reproduce.
              The invariant is the part you can&rsquo;t afford to get wrong — so
              the workspace enforces it.
            </p>
            <div
              className="rise mt-7 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "340ms" }}
            >
              <a
                href="#enter"
                className="font-mono text-[0.74rem] uppercase tracking-[0.14em] bg-ink text-paper px-5 py-3 hover:bg-clay transition-colors"
              >
                Enter the workspace
              </a>
              <a
                href="#lineage"
                className="font-mono text-[0.74rem] uppercase tracking-[0.14em] text-ink-2 px-2 py-3 underline decoration-hairline-2 underline-offset-[6px] hover:text-clay hover:decoration-clay transition-colors"
              >
                See how it&rsquo;s built
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* the graph, full-bleed-ish, on a faint paper panel */}
      <div id="lineage" className="border-t border-hairline bg-paper-2">
        <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-10 md:py-14">
          <div className="flex items-baseline justify-between mb-7">
            <span className="eyebrow">Fig. 1 — One connected graph, not a folder of notebooks</span>
            <span className="eyebrow hidden sm:inline">Lineage · live</span>
          </div>
          <Fig1 />
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Pillars                                                          */
/* ────────────────────────────────────────────────────────────── */
const PILLARS = [
  {
    n: "§ 01",
    id: "provenance",
    title: "Provenance, not faith",
    body: "Every artifact carries a content hash and a lineage hash. “How was this built?” is never a guess and never an archaeology project — it is one click down the graph, all the way to raw data.",
    foot: "content_hash · lineage_hash",
  },
  {
    n: "§ 02",
    id: "policies",
    title: "Invariants as policy",
    body: "Roll conventions, point-in-time knowledge, universe construction — the assumptions that quietly break backtests. Written once as policy, attached to the graph, enforced on every build.",
    foot: "policy:roll_stitch_cl_calendar_panama · live",
  },
  {
    n: "§ 03",
    id: "build",
    title: "Built, not asserted",
    body: "Builds stream step by step: you watch the graph come alive, metered in credits, with an estimate and a gate before anything expensive. The canvas leads with the result — chart, table, lineage.",
    foot: "estimate → confirm → stream",
  },
];

function Pillars() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-16 md:py-20">
        <Reveal>
          <h2 className="font-serif text-[1.9rem] md:text-[2.3rem] font-semibold tracking-[-0.01em] leading-tight max-w-[20ch]">
            Three things a research workspace owes you.
          </h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal
              key={p.id}
              delay={i * 90}
              className={`pt-6 md:pt-0 ${
                i > 0 ? "md:border-l md:border-hairline md:pl-8" : "md:pr-8"
              } ${i > 0 ? "border-t border-hairline md:border-t-0" : ""}`}
            >
              <div id={p.id} className="scroll-mt-24">
                <span className="eyebrow text-clay">{p.n}</span>
                <h3 className="mt-4 font-serif text-[1.4rem] font-semibold leading-snug">
                  {p.title}
                </h3>
                <p className="mt-3 text-[0.95rem] leading-[1.7] text-ink-2">
                  {p.body}
                </p>
                <p className="mt-5 font-mono text-[0.72rem] tracking-[0.04em] text-faint">
                  {p.foot}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Specimen — an artifact fact-sheet                                */
/* ────────────────────────────────────────────────────────────── */
function Specimen() {
  return (
    <section className="border-b border-hairline bg-paper-2">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-x-14">
          <div className="lg:col-span-4">
            <Reveal>
              <span className="eyebrow">Exhibit A — A result, in full</span>
              <h2 className="mt-4 font-serif text-[1.9rem] md:text-[2.3rem] font-semibold tracking-[-0.01em] leading-tight">
                Open any node and read its whole story.
              </h2>
              <p className="mt-4 text-[0.95rem] leading-[1.7] text-ink-2">
                The inspector is polymorphic — it shows a face built for each
                kind. A result leads with what it found, then exactly what it
                was made of, then what to try next.
              </p>
            </Reveal>
          </div>
          <div className="lg:col-span-8">
            <Reveal delay={120}>
              <FactSheet />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function FactSheet() {
  return (
    <article className="border border-ink bg-paper">
      {/* header */}
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-ink">
        <div>
          <p className="eyebrow text-clay">Result</p>
          <h3 className="mt-1.5 font-mono text-[1.05rem] text-ink">
            bt_2024_06_meanrev
          </h3>
          <p className="mt-1 font-serif italic text-[0.95rem] text-ink-2">
            WTI front-month mean-reversion, 5-minute bars
          </p>
        </div>
        <span className="shrink-0 font-mono text-[0.66rem] uppercase tracking-[0.14em] border border-clay text-clay px-2.5 py-1">
          live
        </span>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-hairline border-b border-hairline">
        {[
          ["Sharpe", "1.42"],
          ["Hit rate", "0.561"],
          ["Max DD", "−8.3%"],
          ["Turnover", "0.34"],
        ].map(([k, v]) => (
          <div key={k} className="px-5 py-5">
            <div className="eyebrow">{k}</div>
            <div className="mt-2 font-mono text-[1.5rem] text-ink tabular-nums">
              {v}
            </div>
          </div>
        ))}
      </div>

      {/* body: lineage + provenance */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-hairline">
        <div className="px-6 py-5">
          <p className="eyebrow">Made from</p>
          <ul className="mt-3 space-y-1.5 font-mono text-[0.82rem] text-ink-2">
            {[
              "matrix:signal_matrix_v3",
              "model:linreg_baseline",
              "target:fwd_ret_5m",
              "feature:front_month_cont",
            ].map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className="text-clay">→</span>
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-5 eyebrow">Governed by</p>
          <ul className="mt-2 space-y-1 font-mono text-[0.8rem] text-ink-2">
            <li>roll_stitch_cl_calendar_panama</li>
            <li>
              position_sizing_top_decile_long_short{" "}
              <span className="text-faint">· point_in_time</span>
            </li>
          </ul>
        </div>
        <div className="px-6 py-5">
          <p className="eyebrow">Provenance</p>
          <dl className="mt-3 space-y-2 font-mono text-[0.78rem]">
            {[
              ["content", "sha256:9f3c…a17e"],
              ["lineage", "sha256:21b8…6d04"],
              ["eval", "2024-01-02 → 2024-06-28"],
              ["as_of", "2024-06-28T20:00Z"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-faint">{k}</dt>
                <dd className="text-ink-2 text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* next proposal */}
      <div className="px-6 py-4 border-t border-ink bg-paper-3/60 flex items-start gap-3">
        <span className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-clay mt-0.5">
          Next →
        </span>
        <p className="text-[0.88rem] leading-relaxed text-ink-2">
          <span className="font-medium text-ink">feature_modification</span> —
          widen the z-score window from 20 to 30 bars; the edge concentrates in
          slower reversion.
        </p>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* The arc — empty → rich                                           */
/* ────────────────────────────────────────────────────────────── */
const ARC = [
  ["01", "Hosted data", "Start from a catalog of real datasets — crude, gas, FX, equities — already typed and point-in-time."],
  ["02", "Compose", "Chain operators into features, matrices, targets. The graph grows one honest node at a time."],
  ["03", "Build", "Sign in at the moment it matters. Estimate the cost, confirm, and let the build stream."],
  ["04", "Alive", "The canvas fills with the result; the conversation drives it; lineage is one click away."],
];

function Arc() {
  return (
    <section id="arc" className="border-b border-hairline scroll-mt-24">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-16 md:py-20">
        <Reveal>
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <h2 className="font-serif text-[1.9rem] md:text-[2.3rem] font-semibold tracking-[-0.01em] leading-tight">
              Empty to alive, in four moves.
            </h2>
            <span className="eyebrow">The arc</span>
          </div>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-hairline">
          {ARC.map(([n, title, body], i) => (
            <Reveal
              key={n}
              delay={i * 80}
              className={`pt-7 pb-2 ${
                i > 0 ? "lg:border-l border-hairline lg:pl-7" : "lg:pr-7"
              }`}
            >
              <div className="font-serif text-[2.4rem] text-paper-3 leading-none [-webkit-text-stroke:1px_var(--color-hairline-2)]">
                {n}
              </div>
              <h3 className="mt-4 font-serif text-[1.25rem] font-semibold">
                {title}
              </h3>
              <p className="mt-2.5 text-[0.9rem] leading-[1.65] text-ink-2 pr-3">
                {body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* CTA band                                                         */
/* ────────────────────────────────────────────────────────────── */
function CtaBand() {
  return (
    <section id="enter" className="bg-ink text-paper scroll-mt-16">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-[24ch]">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-clay">
            Enter the workspace
          </p>
          <h2 className="mt-6 font-serif text-[2.6rem] md:text-[3.6rem] font-semibold leading-[1.02] tracking-[-0.02em]">
            Get the assumptions right before the money does.
          </h2>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#top"
            className="font-mono text-[0.76rem] uppercase tracking-[0.14em] bg-clay text-paper px-6 py-3.5 hover:bg-paper hover:text-ink transition-colors"
          >
            Open the prototype
          </a>
          <span className="font-mono text-[0.74rem] text-faint">
            No backend. Fake data, typed to the real contracts.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Colophon                                                         */
/* ────────────────────────────────────────────────────────────── */
function Colophon() {
  return (
    <footer className="bg-paper border-t border-ink">
      <div className="mx-auto max-w-[1180px] px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <div className="flex items-baseline gap-2.5">
              <span className="inline-block h-2.5 w-2.5 bg-clay" />
              <span className="font-serif text-[1.4rem] font-semibold">
                Invariant
              </span>
            </div>
            <p className="mt-4 text-[0.9rem] leading-[1.7] text-muted max-w-[42ch]">
              An interface prototype for a quantitative research workspace.
              Frontend only — the dynamics are simulated, the data is fake, and
              both are typed to the real backend contracts.
            </p>
          </div>
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {[
              ["Workspace", ["Canvas", "Conversation", "Inspector", "Lineage"]],
              ["Concepts", ["Provenance", "Policies", "Point-in-time", "Credits"]],
              ["Colophon", ["Source Serif 4", "Inter", "JetBrains Mono"]],
            ].map(([head, items]) => (
              <div key={head as string}>
                <p className="eyebrow">{head as string}</p>
                <ul className="mt-4 space-y-2.5">
                  {(items as string[]).map((it) => (
                    <li key={it}>
                      <span className="text-[0.86rem] text-ink-2">{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 pt-5 border-t border-hairline flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[0.7rem] text-faint">
            © 2026 Invariant · Prototype
          </span>
          <span className="font-mono text-[0.7rem] text-faint">
            #FAF7F1 · #1C1B18 · #BE4D2B
          </span>
        </div>
      </div>
    </footer>
  );
}
