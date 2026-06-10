"use client";

import type { HostedDataset } from "@/lib/types";
import { STAGE_LANES } from "@/lib/types";

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${(n / 1e3).toFixed(0)}K`);

/** Empty canvas = the promise, not the blank page. The contract rail above
 *  already shows the two locked laws; here the faint stage-lane guides show
 *  where it will build, and one move — start with data — gets it going. */
export function EmptyCanvas({
  datasets,
  onPickData,
}: {
  datasets: HostedDataset[];
  onPickData: (id: string, label: string) => void;
}) {
  return (
    <div className="relative h-full flex items-center justify-center p-8">
      {/* faint stage-lane guides — where the build will land */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex">
        {STAGE_LANES.map((s) => (
          <div key={s} className="flex-1 border-l border-hairline/50 px-3 py-2 first:border-l-0">
            <span className="font-mono text-micro uppercase tracking-[0.16em] text-faint/60">{s}</span>
          </div>
        ))}
      </div>
      <div className="relative w-full max-w-[560px]">
        <p className="eyebrow text-clay text-center">start with data</p>
        <h2 className="mt-3 text-center font-serif text-h1 font-semibold leading-tight">
          Pick a dataset, and watch it build.
        </h2>
        <p className="mt-2 text-center text-body text-muted">
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
          Whatever you build here obeys the two locked laws above — <span className="text-muted">no look-ahead</span> · <span className="text-muted">reproducible</span>.
        </p>
      </div>
    </div>
  );
}
