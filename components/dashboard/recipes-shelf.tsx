import Link from "next/link";
import type { Recipe, RecipeRun } from "@/lib/types";
import { ResearchGraph } from "@/components/landing/research-graph";

/**
 * The Recipes shelf — validated, parameterised workflows crystallised from a
 * workspace. Each card is its lineage at a glance + the pins it carries + a
 * manual / agentic badge. Manual recipes invite "make agentic"; agentic ones
 * show how they run. Starting from a recipe drops you into the workspace with
 * it (and its pins) already loaded.
 */
export function RecipesShelf({ recipes, pinLabels, runsByRecipe = {} }: { recipes: Recipe[]; pinLabels: Record<string, string>; runsByRecipe?: Record<string, RecipeRun[]> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} r={r} pinLabels={pinLabels} runs={runsByRecipe[r.id] ?? []} />
      ))}
    </div>
  );
}

function RecipeCard({ r, pinLabels, runs }: { r: Recipe; pinLabels: Record<string, string>; runs: RecipeRun[] }) {
  const href = `/workspace/${r.workspaceId ?? "new"}`;
  const cta = r.agentic ? "run ▸" : r.state === "validated" ? "make agentic ▸" : "finish it ▸";
  const halted = runs.filter((x) => x.outcome === "halted").length;
  const status = r.agentic
    ? `runs ${r.agentic.trigger === "weekly" ? `weekly · ${r.agentic.triggerNote}` : r.agentic.trigger.replace(/_/g, " ")}`
    : r.state === "validated"
      ? "validated ✓ · manual"
      : "in progress";
  return (
    <div className="group flex flex-col border border-hairline bg-paper hover:border-ink transition-colors">
      <div className="border-b border-hairline bg-paper-2 px-4 py-4 h-[108px] flex items-center justify-center overflow-hidden">
        <ResearchGraph subgraph={r.lineage} variant="thumb" className="max-h-[76px]" />
      </div>
      <div className="px-4 py-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-ui text-ink truncate">{r.name}</span>
          {r.agentic ? (
            <span className="shrink-0 font-mono text-micro uppercase tracking-[0.1em] bg-clay text-paper px-1.5 py-0.5">⚙ agentic</span>
          ) : r.state === "validated" ? (
            <span className="shrink-0 font-mono text-micro uppercase tracking-[0.1em] border border-hairline-2 text-muted px-1.5 py-0.5">manual</span>
          ) : (
            <span className="shrink-0 font-mono text-micro uppercase tracking-[0.1em] border border-dashed border-hairline-2 text-faint px-1.5 py-0.5">draft</span>
          )}
        </div>
        <p className="mt-1 text-ui leading-snug text-muted line-clamp-2">{r.summary}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {r.pins.slice(0, 4).map((id) => (
            <span key={id} className="font-mono text-micro text-clay-deep bg-clay-wash border border-clay/40 px-1 leading-[1.5]">{pinLabels[id] ?? id}</span>
          ))}
          {r.pins.length > 4 && <span className="font-mono text-micro text-faint self-center">+{r.pins.length - 4}</span>}
        </div>
        {runs.length > 0 && (
          <p className="mt-2 font-mono text-micro text-faint">
            {runs.length} run{runs.length > 1 ? "s" : ""}
            {halted > 0 && <span className="text-clay"> · {halted} halted ⛔</span>}
            <span className="text-muted"> · last {runs[0].at.slice(0, 10)}</span>
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="font-mono text-meta text-faint">{status}</span>
          <Link href={href} className="font-mono text-meta uppercase tracking-[0.1em] text-clay hover:underline">{cta}</Link>
        </div>
      </div>
    </div>
  );
}
