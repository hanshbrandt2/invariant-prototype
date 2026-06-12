"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";

/**
 * The gate. One-tap OAuth (simulated) + email fallback. ACTION-scoped: it only
 * appears when a gated action (a build) requests auth — browsing stays open.
 * On login the held action replays; dismissing it (backdrop / ✕) just cancels
 * that action and leaves you where you were.
 */
export function LoginModal() {
  const { ready, authed, gateOpen, login, closeGate } = useAuth();
  const [email, setEmail] = useState("");
  if (!ready || authed || !gateOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button aria-label="dismiss" onClick={closeGate} className="absolute inset-0 bg-paper/70 backdrop-blur-[2px] cursor-default" />
      <div className="relative w-full max-w-[380px] border border-ink bg-paper">
        <button onClick={closeGate} aria-label="close" className="absolute right-3 top-3 grid h-7 w-7 place-items-center text-muted hover:text-clay text-h3 leading-none">×</button>
        <div className="px-7 pt-7 pb-6 border-b border-hairline">
          <div className="flex items-baseline gap-2.5">
            <span className="inline-block h-2.5 w-2.5 bg-clay" />
            <span className="font-serif text-h2 font-semibold">Invariant</span>
          </div>
          <p className="mt-4 font-serif text-h2 leading-snug text-ink">
            Sign in to start a session.
          </p>
          <p className="mt-2 text-ui leading-relaxed text-muted">
            Browsing stays open. An account begins when you build — so every
            result is yours, traceable, and reproducible. Your sessions,
            pinboards and credits travel with you.
          </p>
        </div>

        <div className="px-7 py-6 space-y-2.5">
          <button
            onClick={() => login("google")}
            className="w-full flex items-center justify-center gap-2.5 border border-ink px-4 py-2.5 text-body hover:bg-ink hover:text-paper transition-colors"
          >
            <span className="font-mono text-meta text-clay">G</span>
            Continue with Google
          </button>
          <button
            onClick={() => login("github")}
            className="w-full flex items-center justify-center gap-2.5 border border-ink px-4 py-2.5 text-body hover:bg-ink hover:text-paper transition-colors"
          >
            <span className="font-mono text-meta text-clay">⌥</span>
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 py-2">
            <span className="h-px flex-1 bg-hairline" />
            <span className="eyebrow">or</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login("email", email || undefined);
            }}
            className="space-y-2.5"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@desk.com"
              className="w-full border border-hairline-2 bg-paper-2 px-3.5 py-2.5 text-body font-mono outline-none focus:border-ink"
            />
            <button
              type="submit"
              className="w-full bg-clay text-paper px-4 py-2.5 text-ui font-mono uppercase tracking-[0.12em] hover:bg-clay-deep transition-colors"
            >
              Continue with email
            </button>
          </form>
        </div>

        <p className="px-7 pb-6 font-mono text-meta text-faint leading-relaxed">
          simulated — no real auth. clicking any option signs you in.
        </p>
      </div>
    </div>
  );
}
