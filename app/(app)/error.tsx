"use client";

import Link from "next/link";
import { useEffect } from "react";

/** App-surface error boundary. Honest, recoverable, on-brand. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // a real backend would report this; here it just goes to the console.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-6">
      <div className="max-w-[460px] text-center">
        <div className="inline-block h-2.5 w-2.5 bg-clay mb-5" />
        <h1 className="font-serif text-[1.7rem] font-semibold leading-tight">Something broke on this surface.</h1>
        <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">
          The work you’d done isn’t lost — this view just failed to render. Try again, or head back to the dashboard.
        </p>
        {error.digest && <p className="mt-3 font-mono text-[0.68rem] text-faint">ref: {error.digest}</p>}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="font-mono text-[0.74rem] uppercase tracking-[0.12em] bg-ink text-paper px-4 py-2 rounded-lg hover:bg-clay transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="font-mono text-[0.74rem] uppercase tracking-[0.12em] border border-hairline-2 text-muted px-4 py-2 rounded-lg hover:border-ink hover:text-ink transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
