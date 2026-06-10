import Link from "next/link";
import type { StarterPrompt } from "@/lib/types";

/** Curated "start here" seeds — each opens a pre-scoped conversation. */
export function StarterStrip({ seeds }: { seeds: StarterPrompt[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 border border-hairline divide-y sm:divide-y-0 sm:divide-x divide-hairline">
      {seeds.map((s) => (
        <Link
          key={s.text}
          href={`/workspace/new?build=${encodeURIComponent(s.text)}`}
          className="group p-5 hover:bg-paper-2 transition-colors"
        >
          <p className="font-serif text-h3 leading-snug text-ink">{s.text}</p>
          <p className="mt-3 font-mono text-meta text-faint">{s.op}</p>
          <p className="mt-1 font-mono text-meta text-muted group-hover:text-clay transition-colors">
            start here →
          </p>
        </Link>
      ))}
    </div>
  );
}
