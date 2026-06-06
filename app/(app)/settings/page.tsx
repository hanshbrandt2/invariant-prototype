"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { useCredits } from "@/components/app/credits-context";
import { DATA_SOURCE } from "@/lib/data";

/** Row in a settings card. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-hairline last:border-0">
      <span className="text-[0.86rem] text-ink-2">{label}</span>
      <span className="font-mono text-[0.82rem] text-ink text-right">{children}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow mb-2">{title}</p>
      <div className="rounded-xl border border-hairline bg-white overflow-hidden">{children}</div>
    </section>
  );
}

/**
 * Account / Settings. Honest about the prototype: shows who you are, your
 * (simulated) plan + credits, and the data-source seam the whole app reads
 * through. Nothing here pretends to do more than the frontend can.
 */
export default function SettingsPage() {
  const { email, authed, logout } = useAuth();
  const { balance } = useCredits();

  return (
    <div className="mx-auto max-w-[680px] px-6 md:px-10 py-10">
      <div className="flex items-baseline gap-2 mb-1">
        <Link href="/dashboard" className="text-[0.78rem] text-faint hover:text-clay transition-colors">Dashboard</Link>
        <span className="text-faint">/</span>
        <span className="text-[0.82rem] text-ink">Settings</span>
      </div>
      <h1 className="font-serif text-[2rem] font-semibold tracking-[-0.01em] mb-8">Settings</h1>

      <div className="space-y-7">
        <Card title="account">
          <Row label="Signed in as">{authed ? (email ?? "—") : <span className="text-muted">not signed in</span>}</Row>
          <Row label="Plan">Free</Row>
          <Row label="Sign out">
            <button
              onClick={logout}
              disabled={!authed}
              className="font-mono text-[0.72rem] uppercase tracking-[0.1em] rounded-md border border-hairline-2 px-2.5 py-1 text-muted enabled:hover:border-clay enabled:hover:text-clay disabled:opacity-40 transition-colors"
            >
              Sign out
            </button>
          </Row>
        </Card>

        <Card title="usage">
          <Row label="Credit balance">
            <span className={balance < 10 ? "text-clay" : "text-ink"}>{balance.toFixed(1)}</span>
          </Row>
          <Row label="Billing">
            <span className="text-faint">simulated — no charges in the prototype</span>
          </Row>
        </Card>

        <Card title="data source">
          <Row label="Mode">
            <span className={DATA_SOURCE === "api" ? "text-[#3B6D11]" : "text-clay"}>{DATA_SOURCE}</span>
          </Row>
          <div className="px-4 py-3 text-[0.8rem] leading-relaxed text-muted">
            The app reads every node, dataset, and result through one seam (<span className="font-mono text-[0.74rem] text-ink-2">lib/data</span>).
            It’s on <span className="font-mono text-[0.74rem] text-clay">fixtures</span> now; setting
            <span className="font-mono text-[0.74rem] text-ink-2"> NEXT_PUBLIC_DATA_SOURCE=api</span> points the same calls at a real backend — no component changes.
          </div>
        </Card>

        <Card title="preferences">
          <Row label="Reduced motion">
            <span className="text-faint">follows your system setting</span>
          </Row>
          <Row label="Theme">Warm paper (default)</Row>
        </Card>
      </div>
    </div>
  );
}
