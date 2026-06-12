"use client";

import type { HostedDataset } from "@/lib/types";
import { STAGE_LANES } from "@/lib/types";

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e3).toFixed(0)}K`);

/** The empty canvas = the newcomer's first screen (landing → here). Lead with the
 *  QUESTION, not the blank page: one-click example questions that build on the
 *  spot, then "or start from data". The contract is the engine now (one click away
 *  in audit) — no rail to point at. */
export function EmptyCanvas({
  datasets,
  onPickData,
  onPrompt,
  starterPrompts,
}: {
  datasets: HostedDataset[];
  onPickData: (id: string, label: string) => void;
  onPrompt?: (prompt: string) => void;
  starterPrompts?: string[];
}) {
  const prompts = onPrompt ? (starterPrompts ?? []).slice(0, 3) : [];
  return (
    <div className="relative h-full flex items-center justify-center p-8 overflow-y-auto">
      {/* faint stage-lane guides — where the build will land */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex">
        {STAGE_LANES.map((s) => (
          <div key={s} className="flex-1 border-l border-hairline/50 px-3 py-2 first:border-l-0">
            <span className="font-mono text-micro uppercase tracking-[0.16em] text-faint/60">{s}</span>
          </div>
        ))}
      </div>
      <div className="relative w-full max-w-[600px] py-6">
        <p className="eyebrow text-clay text-center">start a session</p>
        <h2 className="mt-3 text-center font-serif text-h1 font-semibold leading-tight">
          What do you want to test?
        </h2>
        <p className="mt-2 text-center text-body text-muted">
          Type it in the chat on the left — or start from one of these.
        </p>

        {/* one-click example questions — build on the spot, no typing needed */}
        {prompts.length > 0 && (
          <div className="mt-7 space-y-2">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => onPrompt?.(p)}
                className="group w-full flex items-center gap-3 border border-hairline bg-paper px-4 py-3 text-left hover:border-clay transition-colors"
              >
                <span className="min-w-0 flex-1 text-body text-ink">{p}</span>
                <span className="font-mono text-body text-faint group-hover:text-clay transition-colors shrink-0">build →</span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-8 mb-2.5 text-center eyebrow">or start from data</p>
        <div className="border border-hairline bg-paper divide-y divide-hairline">
          {datasets.map((d) => (
            <button
              key={d.id}
              onClick={() => onPickData(d.id, d.name)}
              className="group w-full flex items-center gap-4 px-4 py-3 hover:bg-paper-2 transition-colors text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body text-ink">{d.name}</span>
                <span className="block font-mono text-meta text-faint truncate">
                  {d.id} · {d.schema}
                </span>
              </span>
              <span className="font-mono text-meta text-muted shrink-0">{fmt(d.rows)} rows</span>
              <span className="font-mono text-body text-faint group-hover:text-clay transition-colors">→</span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center font-mono text-meta text-faint">
          Every result here is <span className="text-muted">point-in-time</span> and <span className="text-muted">reproducible</span> by construction — the proof is one click away in audit.
        </p>
      </div>
    </div>
  );
}
