"use client";

/**
 * The run switcher — one run on the canvas at a time. The exploration (run #0)
 * and each agentic re-run are separate executions; flip between them here instead
 * of interleaving two pipelines in the lanes. A run is a vintage of the recipe.
 */
export interface RunMeta {
  id: string;
  label: string;
  outcome: "running" | "validated" | "halted";
}

function Pill({ active, label, outcome, onClick }: { active: boolean; label: string; outcome?: RunMeta["outcome"]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 font-mono text-meta px-2.5 py-1 border transition-colors ${active ? "border-clay bg-clay-wash text-clay-deep" : "border-hairline-2 text-muted hover:text-ink hover:border-ink"}`}
    >
      <span>{label}</span>
      {outcome && (
        <span style={{ color: outcome === "halted" ? "#BE4D2B" : outcome === "validated" ? "#3B6D11" : undefined }}>
          {outcome === "halted" ? "⛔" : outcome === "validated" ? "✓" : "…"}
        </span>
      )}
    </button>
  );
}

export function RunStrip({ runs, activeRunId, onSelect }: { runs: RunMeta[]; activeRunId: string | null; onSelect: (id: string | null) => void }) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-5 py-1.5 border-b border-hairline bg-paper-2/40 overflow-x-auto">
      <span className="eyebrow shrink-0">◷ runs</span>
      <Pill active={activeRunId === null} label="Exploration · 2024" onClick={() => onSelect(null)} />
      {runs.map((r) => (
        <Pill key={r.id} active={activeRunId === r.id} label={r.label} outcome={r.outcome} onClick={() => onSelect(r.id)} />
      ))}
      <span className="shrink-0 ml-auto font-mono text-micro text-faint">one run on the canvas · flip freely · the exploration stays untouched</span>
    </div>
  );
}
