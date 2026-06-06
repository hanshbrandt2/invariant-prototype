"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import { useCredits } from "@/components/app/credits-context";

/**
 * "My Invariant" — the account surface at the top of the sidebar. The login
 * identity's real home: who you are, your plan, your credit balance, settings,
 * sign out. (Org/team switching stays out until there are collaborators.)
 */
export function AccountMenu() {
  const { email, logout } = useAuth();
  const { balance } = useCredits();
  const [open, setOpen] = useState(false);
  const addr = email ?? "you@invariant";
  const initial = addr[0]?.toUpperCase() ?? "Y";

  return (
    <div className="relative px-3 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-hairline-2 hover:border-ink transition-colors text-left"
      >
        <span className="grid place-items-center h-7 w-7 shrink-0 bg-clay text-paper font-mono text-[0.8rem]">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.78rem] text-ink truncate">My Invariant</span>
          <span className="block font-mono text-[0.6rem] text-faint truncate">{addr}</span>
        </span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={open ? "m6 12 4-4 4 4" : "m6 8 4 4 4-4"} />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-[calc(100%-0.25rem)] z-20 mt-1 border border-ink bg-paper">
            <div className="px-3.5 py-3 border-b border-hairline">
              <p className="text-[0.82rem] text-ink truncate">{addr}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] border border-hairline-2 text-muted px-1.5 py-0.5">
                  Free
                </span>
                <span className="font-mono text-[0.6rem] text-faint">plan</span>
              </div>
            </div>

            <div className="px-3.5 py-3 border-b border-hairline flex items-center justify-between">
              <span className="eyebrow">credits</span>
              <span className={`font-mono text-[1.05rem] tabular-nums ${balance < 10 ? "text-clay" : "text-ink"}`}>
                {balance.toFixed(1)}
              </span>
            </div>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3.5 py-2.5 text-[0.82rem] text-ink flex items-center justify-between hover:bg-paper-2 transition-colors"
            >
              Settings
              <span className="font-mono text-[0.7rem] text-faint">→</span>
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full text-left px-3.5 py-2.5 text-[0.82rem] text-ink border-t border-hairline hover:bg-paper-2 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
