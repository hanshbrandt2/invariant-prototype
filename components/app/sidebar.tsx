"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AccountMenu } from "@/components/app/account-menu";

type Item = { label: string; href: string; icon: React.ReactNode; soon?: boolean };

const I = {
  home: <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-4H7v4H4a1 1 0 0 1-1-1z" />,
  search: <><circle cx="9" cy="9" r="5" /><path d="m17 17-4-4" /></>,
  data: <><ellipse cx="10" cy="5.5" rx="6" ry="2.2" /><path d="M4 5.5v9c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2v-9" /></>,
  work: <><rect x="3.5" y="5.5" width="13" height="10" rx="1" /><path d="M3.5 8.5h13" /></>,
  community: <><circle cx="7" cy="8" r="2.2" /><circle cx="13" cy="8" r="2.2" /><path d="M3.5 16c0-2 1.6-3.2 3.5-3.2M16.5 16c0-2-1.6-3.2-3.5-3.2" /></>,
};

const items: Item[] = [
  { label: "Home", href: "/dashboard", icon: I.home },
  { label: "Search", href: "#search", icon: I.search },
  { label: "Hosted data", href: "/dashboard#hosted-data", icon: I.data },
];

const WORKSPACE_VIEWS = [
  { label: "Recent", view: "recent" },
  { label: "All", view: "all" },
  { label: "Starred", view: "starred" },
];

export function Sidebar({ recents = [] }: { recents?: { id: string; name: string }[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[228px] shrink-0 border-r border-hairline bg-paper h-screen sticky top-0">
      <Link href="/" className="flex items-baseline gap-2.5 px-5 h-16 border-b border-hairline">
        <span className="inline-block h-2.5 w-2.5 bg-clay translate-y-[-1px]" />
        <span className="font-serif text-h2 font-semibold tracking-[-0.01em]">Invariant</span>
      </Link>

      {/* account — "My Invariant" */}
      <AccountMenu />

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((it) => {
          const active = pathname === it.href.split("#")[0].split("?")[0] && it.label === "Home";
          const cls = `group flex items-center gap-3 px-3 py-2 rounded-lg text-ui transition-colors w-full ${
            active ? "bg-paper-2 text-ink" : "text-ink-2 hover:bg-paper-2"
          }`;
          const inner = (
            <>
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {it.icon}
              </svg>
              <span>{it.label}</span>
              {it.label === "Search" && <span className="ml-auto font-mono text-meta text-faint border border-hairline-2 rounded px-1">⌘K</span>}
              {it.soon && <span className="ml-auto font-mono text-meta text-faint">soon</span>}
            </>
          );
          // Search opens the command palette in place rather than navigating
          if (it.label === "Search") {
            return (
              <button key={it.label} onClick={() => window.dispatchEvent(new Event("inv:open-search"))} className={cls}>
                {inner}
              </button>
            );
          }
          return (
            <Link key={it.label} href={it.href} className={cls}>
              {inner}
            </Link>
          );
        })}

        {/* Workspaces + its three views */}
        <div className="pt-3">
          <Link
            href="/dashboard#workspaces"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg text-ui text-ink-2 hover:bg-paper-2 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {I.work}
            </svg>
            <span>Workspaces</span>
          </Link>
          <Suspense fallback={<ViewLinks activeView={null} />}>
            <ActiveViewLinks />
          </Suspense>
        </div>

        {/* Recents — quick jump back into recent threads */}
        {recents.length > 0 && (
          <div className="pt-3">
            <p className="px-3 pb-1 eyebrow">Recents</p>
            {recents.map((w) => (
              <Link
                key={w.id}
                href={`/workspace/${w.id}`}
                className="block px-3 py-1.5 rounded-md font-mono text-ui text-ink-2 hover:bg-paper-2 hover:text-ink transition-colors truncate"
              >
                {w.name}
              </Link>
            ))}
          </div>
        )}

        <div className="pt-3">
          <Link
            href="/learn"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg text-ui text-ink-2 hover:bg-paper-2 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5.5 10 3l7 2.5L10 8 3 5.5Z" /><path d="M6 8v4c0 1 2 2 4 2s4-1 4-2V8" />
            </svg>
            <span>Learn</span>
          </Link>
          <Link
            href="/community"
            className="group flex items-center gap-3 px-3 py-2 rounded-lg text-ui text-ink-2 hover:bg-paper-2 transition-colors"
          >
            <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {I.community}
            </svg>
            <span>Community</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}

/** The Recent/All/Starred links, with an active marker tied to ?view=. Isolated
 *  so the useSearchParams CSR-bailout stays inside one Suspense boundary. */
function ViewLinks({ activeView }: { activeView: string | null }) {
  return (
    <div className="ml-[30px] mt-0.5 flex flex-col">
      {WORKSPACE_VIEWS.map((v) => (
        <Link
          key={v.view}
          href={`/dashboard?view=${v.view}#workspaces`}
          className={`px-3 py-1 -ml-px border-l-2 text-ui transition-colors ${activeView === v.view ? "border-clay text-ink" : "border-transparent text-muted hover:text-ink hover:bg-paper-2"}`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}

function ActiveViewLinks() {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  return <ViewLinks activeView={pathname === "/dashboard" ? view ?? "recent" : null} />;
}
