import Link from "next/link";

export interface FunnelItem {
  title: string;
  blurb: string;
  /** the task-scoped build this card starts — a real prompt the workspace can run */
  prompt: string;
  cta: string;
}

/**
 * Shared brand chrome for the funnel stubs (Learn, Community). Each is a thin
 * marketing surface that ALWAYS ends in a task-scoped "start here" — every path
 * funnels into a concrete build, never a dead end. Brand landing stays separate.
 */
export function FunnelPage({
  eyebrow,
  title,
  intro,
  items,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  items: FunnelItem[];
}) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-hairline bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto max-w-[980px] px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2.5">
            <span className="inline-block h-2.5 w-2.5 bg-clay" />
            <span className="font-serif text-[1.2rem] font-semibold">Invariant</span>
          </Link>
          <Link href="/dashboard" className="font-mono text-[0.72rem] uppercase tracking-[0.14em] border border-ink px-3.5 py-2 hover:bg-ink hover:text-paper transition-colors">
            Enter workspace
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-[980px] px-6 py-14">
        <p className="eyebrow text-clay">{eyebrow}</p>
        <h1 className="mt-3 font-serif text-[2.4rem] md:text-[3rem] font-semibold tracking-[-0.015em] leading-[1.05] max-w-[18ch]">{title}</h1>
        <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-2 max-w-[60ch]">{intro}</p>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
          {items.map((it) => (
            <div key={it.title} className="flex flex-col rounded-2xl border border-hairline bg-white p-5 shadow-card">
              <h2 className="font-serif text-[1.2rem] font-semibold leading-snug">{it.title}</h2>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-muted flex-1">{it.blurb}</p>
              <Link
                href={`/workspace/new?build=${encodeURIComponent(it.prompt)}`}
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-clay hover:gap-2.5 transition-all"
              >
                {it.cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-ink bg-ink text-paper p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="font-serif text-[1.3rem] font-semibold">Start here.</p>
            <p className="mt-1 text-[0.9rem] text-paper/70">Pick a thread above, or open a blank workspace and describe what you’re after.</p>
          </div>
          <Link href="/workspace/new" className="shrink-0 font-mono text-[0.74rem] uppercase tracking-[0.14em] bg-clay text-paper px-5 py-2.5 rounded-lg hover:bg-clay-deep transition-colors">
            New workspace →
          </Link>
        </div>
      </main>
    </div>
  );
}
