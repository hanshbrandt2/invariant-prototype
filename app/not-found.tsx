import Link from "next/link";

/** Global 404 — on-brand, points back to the two real entry points. */
export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center bg-paper px-6">
      <div className="max-w-[440px] text-center">
        <div className="flex items-baseline justify-center gap-2.5 mb-6">
          <span className="inline-block h-2.5 w-2.5 bg-clay" />
          <span className="font-serif text-[1.4rem] font-semibold">Invariant</span>
        </div>
        <p className="font-mono text-[0.8rem] text-faint">404</p>
        <h1 className="mt-2 font-serif text-[1.9rem] font-semibold leading-tight">This page isn’t in the graph.</h1>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
          The link may be stale, or the artifact moved. Start fresh from the dashboard or the landing page.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/dashboard" className="font-mono text-[0.74rem] uppercase tracking-[0.12em] bg-ink text-paper px-4 py-2 rounded-lg hover:bg-clay transition-colors">
            Dashboard
          </Link>
          <Link href="/" className="font-mono text-[0.74rem] uppercase tracking-[0.12em] border border-hairline-2 text-muted px-4 py-2 rounded-lg hover:border-ink hover:text-ink transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
