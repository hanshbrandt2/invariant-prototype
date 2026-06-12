"use client";

import { useEffect, useState } from "react";

/**
 * First-run gate. The dashboard is a returning user's LIBRARY; a newcomer should
 * see a focused start, not a hub pre-stocked with demo work that reads as "yours."
 * We can't tell newcomer from returner on the server (the seeded demos always
 * exist), so we decide on the client from localStorage: a visitor has "started"
 * once they hold a session tree or a published finding. SSR defaults to the
 * newcomer view (the safer, simpler default); the library reveals after mount.
 */
function hasStarted(): boolean {
  try {
    if (window.localStorage.getItem("invariant.published-findings")) return true;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("invariant.session:")) return true;
    }
  } catch {
    /* private mode / no storage */
  }
  return false;
}

/** One resolved status, shared by both gates, so a returning user never paints
 *  the newcomer copy (nor vice-versa). `unknown` until the mount effect reads
 *  localStorage; both gates render nothing while unknown — no flash, no SSR
 *  assertion about a user we can't see on the server. */
type Status = "unknown" | "newcomer" | "returning";
function useFirstRun(): Status {
  const [status, setStatus] = useState<Status>("unknown");
  useEffect(() => { setStatus(hasStarted() ? "returning" : "newcomer"); }, []);
  return status;
}

/** Renders its children only for RETURNING users. */
export function ReturningOnly({ children }: { children: React.ReactNode }) {
  return useFirstRun() === "returning" ? <>{children}</> : null;
}

/** Renders its children only for NEWCOMERS. */
export function NewcomerOnly({ children }: { children: React.ReactNode }) {
  return useFirstRun() === "newcomer" ? <>{children}</> : null;
}
