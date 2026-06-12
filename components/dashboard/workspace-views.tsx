"use client";

import { useState } from "react";
import Link from "next/link";
import type { Workspace } from "@/lib/types";
import { WorkspaceCard } from "@/components/dashboard/workspace-card";

type View = "recent" | "all" | "starred";
const VIEWS: { id: View; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "all", label: "All" },
  { id: "starred", label: "Starred" },
];

const byRecency = (a: Workspace, b: Workspace) => (a.updatedAt < b.updatedAt ? 1 : -1);

/**
 * Workspaces = Invariant's projects. Recent (default) / All / Starred, grouped
 * by activity. Each card previews the workspace's lineage in miniature, so the
 * dashboard literally shows provenance at a glance.
 */
export function WorkspaceViews({
  workspaces,
  initial = "recent",
  mode = "library",
}: {
  workspaces: Workspace[];
  initial?: View;
  mode?: "library" | "examples";
}) {
  const [view, setView] = useState<View>(initial);

  // examples mode (newcomers): these seeded workspaces aren't "yours" — they're
  // finished sessions to open and learn from. No tabs, no "+ new", honest heading.
  if (mode === "examples") {
    const shown = [...workspaces].sort(byRecency).slice(0, 3);
    return (
      <section id="examples" className="mt-6 scroll-mt-20">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-h2 font-semibold">Example sessions</h2>
          <span className="eyebrow">open one to see a finished research session</span>
        </div>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shown.map((ws) => (
            <WorkspaceCard key={ws.id} ws={ws} />
          ))}
        </div>
      </section>
    );
  }

  const set =
    view === "starred"
      ? workspaces.filter((w) => w.starred)
      : view === "recent"
        ? workspaces.filter((w) => w.recentlyActive)
        : workspaces;

  const active = [...set].filter((w) => w.recentlyActive).sort(byRecency);
  const older = [...set].filter((w) => !w.recentlyActive).sort(byRecency);

  return (
    <section id="workspaces" className="mt-14 scroll-mt-20">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-h2 font-semibold">Your workspaces</h2>
        <Link
          href="/workspace/new"
          className="font-mono text-meta uppercase tracking-[0.12em] border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors"
        >
          + New workspace
        </Link>
      </div>

      {/* view toggle */}
      <div className="mt-5 flex items-center gap-0.5 border-b border-hairline">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`px-3 py-2 text-ui border-b-2 -mb-px transition-colors ${
              view === v.id ? "border-clay text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {set.length === 0 && (
        <p className="mt-6 text-body text-muted">
          {view === "starred" ? "no starred workspaces yet — star one to pin it here." : "nothing here yet."}
        </p>
      )}

      {active.length > 0 && (
        <>
          <p className="eyebrow mt-7 mb-3">Active recently</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {active.map((ws) => (
              <WorkspaceCard key={ws.id} ws={ws} />
            ))}
          </div>
        </>
      )}

      {older.length > 0 && (
        <>
          <p className="eyebrow mt-9 mb-3">Older</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {older.map((ws) => (
              <WorkspaceCard key={ws.id} ws={ws} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
