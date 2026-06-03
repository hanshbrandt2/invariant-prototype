"use client";

import { AuthProvider } from "@/components/auth/auth-context";
import { CreditsProvider } from "@/components/app/credits-context";
import { LoginModal } from "@/components/auth/login-modal";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

/**
 * Shared chrome for every logged-in surface. Mounts the simulated Auth +
 * Credits providers once (so state persists across app-router navigation),
 * the sidebar/topbar, and the login gate.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CreditsProvider>
        <div className="flex min-h-screen bg-paper">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <Topbar />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
        <LoginModal />
      </CreditsProvider>
    </AuthProvider>
  );
}
