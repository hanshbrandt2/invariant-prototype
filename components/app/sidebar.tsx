"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { CreditMeter } from "@/components/app/credit-meter";

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
  { label: "Search", href: "/dashboard?search=1", icon: I.search, soon: true },
  { label: "Hosted data", href: "/dashboard#hosted-data", icon: I.data },
  { label: "Workspaces", href: "/dashboard#workspaces", icon: I.work },
  { label: "Community", href: "/dashboard#community", icon: I.community, soon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { email, logout } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-[228px] shrink-0 border-r border-hairline bg-paper h-screen sticky top-0">
      <Link href="/" className="flex items-baseline gap-2.5 px-5 h-16 border-b border-hairline">
        <span className="inline-block h-2.5 w-2.5 bg-clay translate-y-[-1px]" />
        <span className="font-serif text-[1.3rem] font-semibold tracking-[-0.01em]">Invariant</span>
      </Link>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((it) => {
          const active = pathname === it.href.split("#")[0].split("?")[0] && it.label === "Home";
          return (
            <Link
              key={it.label}
              href={it.href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[0.86rem] transition-colors ${
                active ? "bg-paper-2 text-ink" : "text-ink-2 hover:bg-paper-2"
              }`}
            >
              <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                {it.icon}
              </svg>
              <span>{it.label}</span>
              {it.soon && <span className="ml-auto font-mono text-[0.6rem] text-faint">soon</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-hairline space-y-3">
        <Link href="/dashboard#credits" className="block rounded-lg border border-hairline-2 px-3 py-2.5 hover:border-ink transition-colors">
          <CreditMeter />
          <p className="mt-1 font-mono text-[0.62rem] text-faint">free tier · builds debit this</p>
        </Link>
        <div className="flex items-center justify-between px-1">
          <div className="min-w-0">
            <p className="text-[0.78rem] text-ink truncate">{email ?? "you"}</p>
            <p className="font-mono text-[0.6rem] text-faint">account</p>
          </div>
          <button onClick={logout} className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted hover:text-clay">
            sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
