"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Simulated auth — no OAuth, no network. A client flag in localStorage.
 * The gate sits in the (app) layout; on "login" we just flip the flag and
 * the page the user already navigated to reveals itself (resume-by-URL).
 */

type Provider = "google" | "github" | "email";

interface AuthValue {
  ready: boolean;
  authed: boolean;
  email: string | null;
  login: (provider: Provider, email?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const KEY = "inv.auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      // ?demo=1 skips the gate (auth is simulated anyway) — handy for deep links
      const demo = new URLSearchParams(window.location.search).get("demo") === "1";
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

  const login = (provider: Provider, e?: string) => {
    const addr = e ?? (provider === "github" ? "you@github" : "you@gmail.com");
    setAuthed(true);
    setEmail(addr);
    try {
      localStorage.setItem(KEY, JSON.stringify({ provider, email: addr }));
    } catch {}
  };

  const logout = () => {
    setAuthed(false);
    setEmail(null);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ ready, authed, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
