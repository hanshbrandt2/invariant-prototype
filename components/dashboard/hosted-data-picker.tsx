import Link from "next/link";
import type { HostedDataset } from "@/lib/types";

const ASSET_LABEL: Record<HostedDataset["assetClass"], string> = {
  energy: "Energy",
  equities: "Equities",
  fx: "FX",
  rates: "Rates",
  metals: "Metals",
  crypto: "Crypto",
};

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);

/** Hosted datasets — pickable (start a workspace) and previewable. */
export function HostedDataPicker({ datasets }: { datasets: HostedDataset[] }) {
  return (
    <div className="border border-hairline divide-y divide-hairline">
      {datasets.map((d) => (
        <Link
          key={d.id}
          href={`/workspace/new?data=${d.id}`}
          className="group flex items-center gap-4 px-4 py-3 hover:bg-paper-2 transition-colors"
        >
          <span className="font-mono text-meta uppercase tracking-[0.12em] text-muted w-20 shrink-0">
            {ASSET_LABEL[d.assetClass]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body text-ink">{d.name}</span>
            {/* the id stays whole (it's the identifier); only the variable schema ellipsizes */}
            <span className="flex items-baseline gap-1 font-mono text-meta text-faint min-w-0">
              <span className="shrink-0">{d.id}</span>
              <span className="text-hairline-2 shrink-0">·</span>
              <span className="truncate">{d.schema}</span>
            </span>
          </span>
          <span className="font-mono text-meta text-muted tabular-nums shrink-0">{fmt(d.rows)} rows</span>
          <span className="font-mono text-body text-faint group-hover:text-clay transition-colors">→</span>
        </Link>
      ))}
    </div>
  );
}
