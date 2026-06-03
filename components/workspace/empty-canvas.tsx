"use client";

import type { HostedDataset } from "@/lib/types";

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e3).toFixed(0)}K`);

/** Empty canvas = an invitation, not blank. One move: start with data. */
export function EmptyCanvas({
  datasets,
  onPickData,
}: {
  datasets: HostedDataset[];
  onPickData: (id: string, label: string) => void;
}) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-[560px]">
        <p className="eyebrow text-clay text-center">start with data</p>
        <h2 className="mt-3 text-center font-serif text-[1.7rem] font-semibold leading-tight">
          Pick a dataset, and watch it build.
        </h2>
        <p className="mt-2 text-center text-[0.9rem] text-muted">
          or describe an idea in the conversation — it compiles to a build.
        </p>

        <div className="mt-7 border border-hairline bg-paper divide-y divide-hairline">
          {datasets.map((d) => (
            <button
              key={d.id}
              onClick={() => onPickData(d.id, d.name)}
              className="group w-full flex items-center gap-4 px-4 py-3 hover:bg-paper-2 transition-colors text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[0.92rem] text-ink">{d.name}</span>
                <span className="block font-mono text-[0.7rem] text-faint truncate">
                  {d.id} · {d.schema}
                </span>
              </span>
              <span className="font-mono text-[0.72rem] text-muted shrink-0">{fmt(d.rows)} rows</span>
              <span className="font-mono text-[0.9rem] text-faint group-hover:text-clay transition-colors">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
