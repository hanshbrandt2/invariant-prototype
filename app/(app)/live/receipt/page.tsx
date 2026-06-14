"use client";

// /live/receipt — Phase-4 Slice 6 (ADR-0002, MIGRATION step 3 preview): the
// reproducibility RECEIPT and the assembled Code lens, both REAL — produced by
// dsl-engine codegen (emit → assemble_dag → build_receipt) and served over
// research-workbench (:8105), driven by REAL producing DAGs from the registry
// (catalog/dags/*.yaml). The emitted code + receipt are parity-verified against
// the executor. A DAG whose operators aren't emittable yet returns a clean
// blocked result — honest, demand-ranked coverage, not a fake. Honesty bar: the
// surface shows exactly which real pipelines package today and why the rest don't.

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  Receipt,
  AssembledCode,
  DagListItem,
  ReceiptResult,
  ReproducibilityClass,
} from "@/lib/types";
import { listLiveDags, getLiveReceipt, getLiveAssembled } from "@/lib/data";
import { CodeBlock } from "@/components/workspace/code-lens";
import { zipSync } from "@/lib/zip";

const DEFAULT_DAG_ID = "cl_15m_target_dag";

function ReproBadge({ cls }: { cls: ReproducibilityClass }) {
  const bit = cls === "bit_identical";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-meta uppercase tracking-[0.1em] ${
        bit ? "border-green/40 bg-green/5 text-green" : "border-clay/40 bg-clay-wash text-clay-deep"
      }`}
      title={
        bit
          ? "Deterministic dataframe ops — byte-identical on any machine. The parity gate enforces this."
          : "Model-fit — bit-identical same-machine, within-tolerance cross-machine (BLAS/numpy variance). Declared in the receipt."
      }
    >
      {bit ? "✓ bit-identical" : "≈ epsilon"}
    </span>
  );
}

function LiveReceiptInner() {
  // ?dag=<id> deep-links a specific producing pipeline (e.g. from an artifact's
  // "code & receipt" affordance — its spec.dag_id). Falls back to the default.
  const dagParam = useSearchParams().get("dag");
  const [dags, setDags] = useState<DagListItem[]>([]);
  const [selected, setSelected] = useState<string>(dagParam || DEFAULT_DAG_ID);
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [assembled, setAssembled] = useState<AssembledCode | null>(null);
  const [mode, setMode] = useState<"receipt" | "assembled">("receipt");
  const [activeFile, setActiveFile] = useState<string>("pipeline.py");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [packaging, setPackaging] = useState(false);

  // load the real DAG registry once
  useEffect(() => {
    listLiveDags()
      .then((d) => {
        setDags(d);
        const start =
          (dagParam && d.find((x) => x.id === dagParam)?.id) ||
          d.find((x) => x.id === DEFAULT_DAG_ID)?.id ||
          d[0]?.id;
        if (start) open(start);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // mount-only: the registry loads once; ?dag= is read here for the initial
    // selection. The artifact affordance deep-links via a full navigation
    // (remount), so a changing param re-runs this; in-page rail clicks call
    // open() directly without touching the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function open(dag: string) {
    setSelected(dag);
    setResult(null);
    setAssembled(null);
    setMode("receipt");
    setPackaging(true);
    getLiveReceipt(dag)
      .then((r) => {
        setResult(r);
        if (r.ok) {
          setActiveFile(r.receipt.entrypoint || r.receipt.files[0]?.name || "pipeline.py");
          getLiveAssembled(dag).then((a) => setAssembled(a ?? null)).catch(() => setAssembled(null));
        }
      })
      .catch((e) => setResult({ ok: false, status: 502, detail: String(e) }))
      .finally(() => setPackaging(false));
  }

  const receipt: Receipt | null = result?.ok ? result.receipt : null;
  const file = useMemo(
    () => receipt?.files.find((f) => f.name === activeFile) ?? receipt?.files[0],
    [receipt, activeFile],
  );
  const cls = receipt?.reproducibilityClass ?? assembled?.reproducibilityClass;
  const selDag = dags.find((d) => d.id === selected);

  function download() {
    if (!receipt) return;
    const blob = zipSync(receipt.files.map((f) => ({ path: f.name, content: f.content })));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected}_receipt.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 md:px-8 py-8 md:py-10">
      <div className="flex items-baseline gap-2">
        <Link href="/live" className="text-ui text-faint hover:text-clay">Live catalog</Link>
        <span className="text-faint">/</span>
        <span className="text-ui text-ink">Code &amp; Receipt</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-h1 font-semibold">Code &amp; receipt</h1>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-meta uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> live · dsl-engine via rwb
        </span>
        {cls && <ReproBadge cls={cls} />}
        <Link href="/live" className="ml-auto text-ui text-faint hover:text-clay">← Artifacts</Link>
      </div>

      <p className="mt-2 max-w-[72ch] text-body text-ink-2">
        ADR-0002: the published code is not a sketch — it is a{" "}
        <span className="text-ink">parity-verified rendering of what the executor runs</span> (each operator&apos;s{" "}
        <span className="font-mono text-meta">emit()</span> is gated bit-identical against{" "}
        <span className="font-mono text-meta">execute()</span>). Pick a{" "}
        <span className="text-ink">real producing pipeline</span> from the registry below; its receipt is the live output of{" "}
        <span className="font-mono text-meta">emit → assemble_dag → build_receipt</span>. Clone it, point it at your data, get the same numbers.
      </p>

      {loading && <p className="mt-10 text-ui text-muted">Loading the DAG registry…</p>}
      {error && (
        <p className="mt-10 text-ui text-clay">
          Could not reach research-workbench (:8105): <span className="font-mono text-meta">{error}</span>
        </p>
      )}

      {!loading && !error && (
        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[300px_1fr]">
          {/* the real DAG registry */}
          <div>
            <p className="eyebrow mb-3">Producing pipelines [{dags.length}]</p>
            <div className="max-h-[74vh] space-y-1 overflow-y-auto pr-1">
              {dags.map((d) => (
                <button
                  key={d.id}
                  onClick={() => open(d.id)}
                  className={`block w-full border px-3 py-2 text-left transition-colors ${
                    selected === d.id ? "border-clay bg-clay-wash" : "border-hairline hover:border-ink-2"
                  }`}
                >
                  <span className="block truncate font-mono text-meta text-ink">{d.id}</span>
                  <span className="font-mono text-micro text-muted">{d.stage}{d.resourceHint === "heavy" ? " · heavy" : ""}</span>
                </button>
              ))}
            </div>
          </div>

          {/* the receipt / assembled view for the selected DAG */}
          <div className="min-w-0">
            {packaging && <p className="text-ui text-muted">Packaging <span className="font-mono text-meta">{selected}</span> from dsl-engine…</p>}

            {!packaging && result && !result.ok && (
              <div className="rounded-lg border border-clay/30 bg-clay-wash/30 p-5">
                <p className="font-mono text-meta uppercase tracking-[0.1em] text-clay-deep">not yet packageable</p>
                <p className="mt-2 text-body text-ink-2">
                  <span className="font-mono text-meta text-ink">{selected}</span> uses an operator whose{" "}
                  <span className="font-mono text-meta">emit()</span> isn&apos;t shipped yet (or a DAG shape the v1 assembler doesn&apos;t support). The engine says:
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded border border-hairline bg-white px-3 py-2 font-mono text-meta text-clay-deep">
                  {result.detail}
                </p>
                <p className="mt-3 text-meta text-muted">
                  emit() coverage rolls out per operator, demand-ranked — this is honest coverage, not a failure. The receipt machinery is real (try{" "}
                  <button onClick={() => open(DEFAULT_DAG_ID)} className="text-clay underline-offset-2 hover:underline">{DEFAULT_DAG_ID}</button>).
                </p>
              </div>
            )}

            {!packaging && receipt && (
              <div>
                {selDag?.description && (
                  <p className="mb-3 max-w-[72ch] text-meta text-muted">{selDag.description.split("\n")[0]}</p>
                )}
                {/* manifest strip */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-y border-hairline py-2.5 font-mono text-meta text-muted">
                  <span>entrypoint <span className="text-ink-2">{receipt.entrypoint}</span></span>
                  <span>output <span className="text-ink-2">{receipt.outputName}</span></span>
                  <span>
                    inputs{" "}
                    {receipt.inputIds.map((id) => (
                      <span key={id} className="ml-1 text-ink-2">{id}</span>
                    ))}
                  </span>
                  <span className="ml-auto text-faint">{receipt.files.length} files</span>
                </div>

                {/* mode toggle + download */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="inline-flex border border-hairline rounded overflow-hidden">
                    {(["receipt", "assembled"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-3 py-1 font-mono text-meta uppercase tracking-[0.06em] transition-colors ${
                          mode === m ? "bg-clay-wash text-clay-deep" : "text-muted hover:text-ink"
                        }`}
                      >
                        {m === "receipt" ? "Receipt · package" : "Assembled · 1 file"}
                      </button>
                    ))}
                  </div>
                  {mode === "receipt" && (
                    <button
                      onClick={download}
                      title="download the runnable receipt as a .zip"
                      className="ml-auto font-mono text-meta uppercase tracking-[0.06em] text-ink-2 hover:text-ink border border-hairline-2 hover:border-ink rounded px-2.5 py-1 transition-colors"
                    >
                      ⬇ {selected}_receipt.zip
                    </button>
                  )}
                </div>

                {/* the code surface */}
                {mode === "receipt" ? (
                  <div className="mt-3 flex rounded-lg border border-hairline bg-white overflow-hidden">
                    <div className="w-[190px] shrink-0 border-r border-hairline bg-paper-2/60 py-2">
                      {receipt.files.map((f) => (
                        <button
                          key={f.name}
                          onClick={() => setActiveFile(f.name)}
                          className={`flex w-full items-center gap-2 py-[5px] pl-3 pr-2 text-left font-mono text-meta border-l-2 transition-colors ${
                            f.name === file?.name
                              ? "bg-clay-wash border-clay text-clay-deep"
                              : "border-transparent text-ink-2 hover:bg-paper"
                          }`}
                          title={f.name}
                        >
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0 overflow-auto bg-[#FBF9F4]">
                      {file && <CodeBlock code={file.content} flush />}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-hairline bg-[#FBF9F4] overflow-auto">
                    {assembled ? (
                      <CodeBlock code={assembled.source} flush />
                    ) : (
                      <p className="p-4 text-ui text-muted">No assembled source.</p>
                    )}
                  </div>
                )}

                <p className="mt-3 font-mono text-micro text-faint">
                  git clone → pip install -e . → python -c &quot;import pipeline; pipeline.run(...)&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveReceiptPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ui text-muted">Loading…</div>}>
      <LiveReceiptInner />
    </Suspense>
  );
}
