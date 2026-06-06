"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";

/**
 * Simulated auth — no OAuth, no network. A client flag in localStorage.
 *
 * The gate is ACTION-scoped, not a blanket overlay: browsing the dashboard and
 * composing in a workspace stay open. `requireAuth(action)` runs the action
 * immediately when authed; otherwise it stashes the action, opens the login
 * modal, and replays the action on login ("login-at-build"). Swapping in real
 * OAuth later means replacing `login()` — the gate mechanics are unchanged.
 */

type Provider = "google" | "github" | "email";

interface AuthValue {
  ready: boolean;
  authed: boolean;
  email: string | null;
  gateOpen: boolean;
  /** run `action` now if authed; else open the gate and replay it on login.
   *  returns true if it ran immediately. */
  requireAuth: (action?: () => void) => boolean;
  closeGate: () => void;
  login: (provider: Provider, email?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const KEY = "inv.auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      // ?demo=1 skips the gate (auth is simulated anyway) — dev/deep-link only,
      // never honoured in a production build.
      const demo = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("demo") === "1";
      const raw = localStorage.getItem(KEY);
      if (demo && !raw) {
        const v = { provider: "demo", email: "demo@invariant" };
        localStorage.setItem(KEY, JSON.stringify(v));
        setAuthed(true);
        setEmail(v.email);
      } else if (raw) {
        const v = JSON.parse(raw);
        setAuthed(true);
        setEmail(v.email ?? null);
      }
    } catch {}
    setReady(true);
  }, []);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (authed) {
        action?.();
        return true;
      }
      pendingRef.current = action ?? null;
      setGateOpen(true);
      return false;
    },
    [authed]
  );

  const closeGate = useCallback(() => {
    pendingRef.current = null;
    setGateOpen(false);
  }, []);

  const login = useCallback((provider: Provider, e?: string) => {
    const addr = e ?? (provider === "github" ? "you@github" : "you@gmail.com");
    setAuthed(true);
    setEmail(addr);
    setGateOpen(false);
    try {
      localStorage.setItem(KEY, JSON.stringify({ provider, email: addr }));
    } catch {}
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) setTimeout(pending, 0); // replay the gated action once state settles
  }, []);

  const logout = useCallback(() => {
    setAuthed(false);
    setEmail(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ ready, authed, email, gateOpen, requireAuth, closeGate, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
