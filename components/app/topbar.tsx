"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditMeter } from "@/components/app/credit-meter";

/** Thin breadcrumb bar. Credit chip on the right for the work surfaces. */
export function Topbar() {
  const pathname = usePathname();
  const segs = pathname.split("/").filter(Boolean); // ["dashboard"] | ["workspace","crude-oil-research"]
  const inWorkspace = segs[0] === "workspace";

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-hairline bg-paper/90 backdrop-blur-sm">
      <div className="h-full px-5 md:px-8 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-ui">
          <Link href="/dashboard" className="text-muted hover:text-clay transition-colors">
            Dashboard
          </Link>
          {inWorkspace && (
            <>
              <span className="text-faint">/</span>
              <span className="font-mono text-ui text-ink">{segs[1]}</span>
            </>
          )}
        </nav>
        {inWorkspace && (
          <div className="rounded-lg border border-hairline-2 px-3 py-1.5">
            <CreditMeter compact />
          </div>
        )}
      </div>
    </header>
  );
}
