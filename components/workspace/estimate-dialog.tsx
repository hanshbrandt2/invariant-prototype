"use client";

/** Big builds get an estimate + confirm — the gate approves the SPEND, not
 *  only the computation. Cheap builds skip this and just run. */
export function EstimateDialog({
  steps,
  credits,
  etaSec,
  scopeNote,
  onRun,
  onCancel,
}: {
  steps: number;
  credits: number;
  etaSec: number;
  scopeNote?: string;
  onRun: () => void;
  onCancel: () => void;
}) {
  const mins = Math.max(1, Math.round(etaSec / 60));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative w-full max-w-[400px] border border-ink bg-paper">
        <div className="px-6 py-5 border-b border-hairline">
          <p className="eyebrow text-clay">estimate · confirm the spend</p>
          <h3 className="mt-2 font-serif text-[1.35rem] leading-snug">
            ~{steps} steps{scopeNote ? ` over ${scopeNote}` : ""}.
          </h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-hairline border-b border-hairline">
          {[
            ["steps", String(steps)],
            ["credits", `~${credits}`],
            ["time", `~${mins} min`],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-4">
              <div className="eyebrow">{k}</div>
              <div className="mt-1.5 font-mono text-[1.2rem] text-ink tabular-nums">{v}</div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={onRun}
            className="font-mono text-[0.74rem] uppercase tracking-[0.13em] bg-clay text-paper px-5 py-2.5 hover:bg-clay-deep transition-colors"
          >
            run it
          </button>
          <button
            onClick={onCancel}
            className="font-mono text-[0.74rem] uppercase tracking-[0.13em] text-muted px-2 py-2.5 hover:text-ink transition-colors"
          >
            scope down
          </button>
          <span className="ml-auto font-mono text-[0.68rem] text-faint">cheap builds just run</span>
        </div>
      </div>
    </div>
  );
}
