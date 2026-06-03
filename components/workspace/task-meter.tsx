"use client";

import type { StepState } from "@/components/workspace/workspace-client";

/** The task list doubles as the meter: steps tick, credits accrue, live. */
export function TaskMeter({ steps }: { steps: StepState[] }) {
  const total = steps.reduce((a, s) => a + s.step.credits, 0);
  const spent = steps.filter((s) => s.status === "done").reduce((a, s) => a + s.step.credits, 0);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const running = steps.find((s) => s.status === "running");

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-[540px]">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-clay">building</p>
          <p className="font-mono text-[0.72rem] text-muted">
            {doneCount}/{steps.length} steps
          </p>
        </div>
        <h2 className="mt-2 font-serif text-[1.5rem] font-semibold leading-tight">
          {running ? running.step.label : doneCount === steps.length ? "landing the result…" : "decomposing the request…"}
        </h2>

        <ol className="mt-7 border border-hairline bg-paper divide-y divide-hairline">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={`inline-flex h-4 w-4 items-center justify-center shrink-0 rounded-full border text-[0.6rem] ${
                  s.status === "done"
                    ? "bg-ink border-ink text-paper"
                    : s.status === "running"
                    ? "border-clay text-clay animate-pulse"
                    : "border-hairline-2 text-faint"
                }`}
              >
                {s.status === "done" ? "✓" : i + 1}
              </span>
              <span className={`flex-1 text-[0.86rem] ${s.status === "pending" ? "text-faint" : "text-ink"}`}>
                {s.step.label}
              </span>
              {s.step.op && <span className="font-mono text-[0.68rem] text-faint">{s.step.op}</span>}
              <span className={`font-mono text-[0.72rem] tabular-nums w-12 text-right ${s.status === "done" ? "text-ink-2" : "text-faint"}`}>
                {s.status === "done" ? `−${s.step.credits}` : s.step.credits}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-3 flex items-center justify-between font-mono text-[0.74rem]">
          <span className="text-muted">credits spent</span>
          <span className="text-ink tabular-nums">
            {spent.toFixed(1)} <span className="text-faint">/ {total.toFixed(1)} est.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
