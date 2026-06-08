"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";

const I = {
  home: <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-4H7v4H4a1 1 0 0 1-1-1z" />,
  data: <><ellipse cx="10" cy="5.5" rx="6" ry="2.2" /><path d="M4 5.5v9c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-9" /></>,
  search: <><circle cx="9" cy="9" r="5" /><path d="m17 17-4-4" /></>,
};

function Ico({ href, title, children }: { href: string; title: string; children: React.ReactNode }) {
  return (
    <Link href={href} title={title} className="grid h-[38px] w-[38px] place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink  transition-all">
      <svg viewBox="0 0 20 20" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </Link>
  );
}

/**
 * The workspace's slim icon nav — the full "My Invariant" sidebar lives on the
 * dashboard; in the work surface the chrome steps back to a 60px rail so the
 * canvas is the hero.
 */
export function WorkspaceRail() {
  const { email } = useAuth();
  const initial = (email ?? "you")[0]?.toUpperCase() ?? "Y";

  return (
    <nav className="flex w-[60px] shrink-0 flex-col items-center gap-1.5 py-4 bg-paper-2">
      <Link href="/" title="Invariant" className="mb-3 inline-block h-3 w-3 rounded-[3px] bg-clay" />
      <Ico href="/dashboard" title="Home">{I.home}</Ico>
      <Ico href="/dashboard#hosted-data" title="Hosted data">{I.data}</Ico>
      <Ico href="/dashboard?search=1" title="Search">{I.search}</Ico>
      <Link
        href="/dashboard"
        title={email ?? "account"}
        className="mt-auto grid h-[34px] w-[34px] place-items-center rounded-full bg-clay font-mono text-[0.85rem] text-paper"
      >
        {initial}
      </Link>
    </nav>
  );
}
