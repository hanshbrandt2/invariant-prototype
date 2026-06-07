"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Fake credit counter. Builds debit it; the meter (sidebar + workspace) reads
 * it; big builds gate the spend. Free tier = the cheap first-wow loop.
 */

interface CreditsValue {
  ready: boolean;
  balance: number;
  debit: (n: number) => void;
  reset: () => void;
}

const CreditsContext = createContext<CreditsValue | null>(null);
const KEY = "inv.credits";
const START = 50;

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState(START);

  /* eslint-disable react-hooks/set-state-in-effect -- mount-time localStorage hydration; lazy init would mismatch SSR */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw != null) setBalance(Number(raw));
    } catch {}
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const write = (v: number) => {
    try {
      localStorage.setItem(KEY, String(v));
    } catch {}
    return v;
  };

  // functional update — multiple debits within one build must not race on a
  // stale `balance` closure (each step debits as it completes)
  const debit = (n: number) => setBalance((prev) => write(Math.max(0, +(prev - n).toFixed(1))));
  const reset = () => setBalance(write(START));

  return (
    <CreditsContext.Provider value={{ ready, balance, debit, reset }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const v = useContext(CreditsContext);
  if (!v) throw new Error("useCredits must be used within CreditsProvider");
  return v;
}
