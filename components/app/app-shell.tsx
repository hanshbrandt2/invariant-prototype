"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/components/auth/auth-context";
import { CreditsProvider } from "@/components/app/credits-context";
import { LoginModal } from "@/components/auth/login-modal";
import { CommandPalette } from "@/components/app/command-palette";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

/**
 * Shared chrome for logged-in surfaces. Mounts the simulated Auth + Credits
 * providers once. The DASHBOARD (and hub pages) get the full sidebar + topbar;
 * the WORKSPACE is a full-bleed work surface that owns its own slim chrome
 * (icon rail + collapsible chat + canvas-hero), so the shell steps out of the way.
 */
export function AppShell({
  children,
  recents = [],
}: {
  children: React.ReactNode;
  recents?: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const inWorkspace = pathname.startsWith("/workspace");

  return (
    <AuthProvider>
      <CreditsProvider>
        {inWorkspace ? (
          <div id="main-content" className="h-screen bg-paper-2">{children}</div>
        ) : (
          <div className="flex min-h-screen bg-paper">
            <Sidebar recents={recents} />
            <div className="flex-1 min-w-0 flex flex-col">
              <Topbar />
              <main id="main-content" className="flex-1 min-w-0">{children}</main>
            </div>
          </div>
        )}
        <LoginModal />
        <CommandPalette />
      </CreditsProvider>
    </AuthProvider>
  );
}
