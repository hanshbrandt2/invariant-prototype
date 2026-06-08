"use client";

import { useState } from "react";
import type { AgenticConfig, Pin, Recipe } from "@/lib/types";

type ScopeId = AgenticConfig["scope"][number];
const SCOPES: { id: ScopeId; label: string }[] = [
  { id: "new_data", label: "new data" },
  { id: "param_sweep", label: "param sweep" },
  { id: "universe", label: "the universe" },
];
const TRIGGERS: { id: AgenticConfig["trigger"]; label: string }[] = [
  { id: "on_demand", label: "on demand" },
  { id: "weekly", label: "weekly · Mon 06:00" },
  { id: "on_new_data", label: "when new data arrives" },
];

/**
 * The manual → agentic promotion. Two commitments, in order: ① crystallise the
 * validated workflow as a reusable recipe (its DAG + the knobs that may vary +
 * the pins it must obey); ② let the agent RUN it on its own — but only ever
 * inside those pins. A violation halts the run; that guardrail is the whole
 * point, so it's stated plainly at the bottom.
 */
export function PromotePanel({
  recipe,
  pins,
  onSaveRecipe,
  onEnableAgentic,
  onClose,
}: {
  recipe: Recipe;
  pins: Pin[];
  onSaveRecipe: (name: string) => void;
  onEnableAgentic: (config: AgenticConfig) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(recipe.name);
  const [saved, setSaved] = useState(false);
  const [scope, setScope] = useState<ScopeId[]>(["new_data", "param_sweep"]);
  const [trigger, setTrigger] = useState<AgenticConfig["trigger"]>("weekly");
  const [budget, setBudget] = useState(25);

  const toggleScope = (id: ScopeId) => setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const Section = "font-mono text-[0.62rem] uppercase tracking-[0.14em]";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/20 p-4" onClick={onClose}>
      <div className="w-full max-w-[620px] max-h-[90vh] overflow-y-auto bg-paper border border-hairline-2" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-hairline">
          <div>
            <p className="eyebrow text-clay">promote workflow</p>
            <h2 className="mt-1 font-serif text-[1.3rem] leading-tight text-ink">{recipe.name}</h2>
            <p className="mt-0.5 font-mono text-[0.66rem] text-muted">{recipe.lineage.nodes.length} artifacts · <span className="text-green">validated ✓</span></p>
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center text-muted hover:text-clay text-[1.1rem] leading-none" aria-label="close">×</button>
        </div>

        {/* ① save as recipe */}
        <div className="px-6 py-5 border-b border-hairline">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-serif text-[1.05rem] text-ink">①</span>
            <span className={`${Section} text-ink`}>save as recipe</span>
            <span className="text-[0.78rem] text-muted">— a reusable, parameterised template of this workflow</span>
          </div>
          <label className="block">
            <span className={`${Section} text-muted`}>name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full bg-white border border-hairline px-3 py-1.5 text-[0.9rem] text-ink outline-none focus:border-hairline-2" />
          </label>
          <div className="mt-3">
            <span className={`${Section} text-muted`}>knobs the agent may vary</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {recipe.knobs.map((k) => (
                <span key={k.param} className="font-mono text-[0.66rem] border border-hairline-2 bg-white px-2 py-0.5 text-ink-2">
                  {k.param} <span className="text-faint">▸ {k.current}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <span className={`${Section} text-muted`}>pins it must obey — these travel with the recipe</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pins.map((p) => (
                <span key={p.id} className="font-mono text-[0.62rem] bg-clay-wash text-clay-deep border border-clay px-2 py-0.5">
                  {p.state === "structural" ? "🔒 " : ""}{p.label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => { onSaveRecipe(name); setSaved(true); }}
              disabled={saved}
              className="font-mono text-[0.66rem] uppercase tracking-[0.12em] bg-ink text-paper px-3.5 py-1.5 hover:bg-clay transition-colors disabled:bg-green disabled:text-paper"
            >
              {saved ? "recipe saved ✓" : "save recipe"}
            </button>
            {saved && <span className="font-mono text-[0.66rem] text-muted">saved to your recipes · reproducible by construction</span>}
          </div>
        </div>

        {/* ② make it agentic */}
        <div className={`px-6 py-5 ${saved ? "" : "opacity-45 pointer-events-none"}`}>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-serif text-[1.05rem] text-ink">②</span>
            <span className={`${Section} text-ink`}>make it agentic</span>
            <span className="text-[0.78rem] text-muted">{saved ? "— let the agent run it on its own" : "— save the recipe first"}</span>
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <span className={`${Section} text-muted`}>may vary</span>
              <div className="mt-1.5 space-y-1.5">
                {SCOPES.map((s) => (
                  <button key={s.id} onClick={() => toggleScope(s.id)} className="flex items-center gap-2 text-[0.82rem] text-ink-2">
                    <span className={`grid h-4 w-4 place-items-center border ${scope.includes(s.id) ? "bg-ink border-ink text-paper" : "border-hairline-2"} font-mono text-[0.6rem]`}>{scope.includes(s.id) ? "✓" : ""}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className={`${Section} text-muted`}>runs</span>
              <div className="mt-1.5 space-y-1.5">
                {TRIGGERS.map((t) => (
                  <button key={t.id} onClick={() => setTrigger(t.id)} className="flex items-center gap-2 text-[0.82rem] text-ink-2">
                    <span className={`grid h-4 w-4 place-items-center rounded-full border ${trigger === t.id ? "border-clay" : "border-hairline-2"}`}>
                      {trigger === t.id && <span className="h-2 w-2 rounded-full bg-clay" />}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2">
            <span className={`${Section} text-muted`}>budget</span>
            <input type="number" value={budget} min={1} onChange={(e) => setBudget(Number(e.target.value))} className="w-16 bg-white border border-hairline px-2 py-1 font-mono text-[0.8rem] text-ink outline-none" />
            <span className="font-mono text-[0.72rem] text-faint">credits / run</span>
          </label>

          <div className="mt-4 border-l-2 border-clay pl-3 py-1">
            <p className="text-[0.84rem] leading-snug text-ink-2">
              <span className="text-clay">⚠ guardrail:</span> any artifact the agent makes that fails one of the {pins.length} pinned laws <span className="text-ink">halts the run</span> — it can&apos;t quietly ship a wrong number.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => onEnableAgentic({ scope, trigger, triggerNote: trigger === "weekly" ? "Mon 06:00" : undefined, budget, enabledAt: "" })}
              className="font-mono text-[0.66rem] uppercase tracking-[0.12em] bg-clay text-paper px-3.5 py-1.5 hover:bg-clay-deep transition-colors"
            >
              enable ⚙ &amp; preview a run →
            </button>
            <span className="font-mono text-[0.62rem] text-faint">prototype — the preview run is simulated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
