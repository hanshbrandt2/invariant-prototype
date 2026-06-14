"use client";

// /live/receipt — Phase-4 Slice 6 (ADR-0002, MIGRATION step 3 preview): the
// reproducibility RECEIPT and the assembled Code lens, both REAL — produced by
// dsl-engine codegen (emit → assemble_dag → build_receipt) and served over
// research-workbench (:8105). The emitted code + receipt are parity-verified
// against the executor; the INPUT DAG is a labelled demo until the build-stream
// produces real ones (the artifact→TransformNode gap, task #10). Honesty bar:
// the surface says exactly which half is real and which is a placeholder.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Receipt, AssembledCode, ReproducibilityClass } from "@/lib/types";
import { getLiveReceipt, getLiveAssembled } from "@/lib/data";
import { CodeBlock } from "@/components/workspace/code-lens";
import { zipSync } from "@/lib/zip";

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

export default function LiveReceiptPage() {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [assembled, setAssembled] = useState<AssembledCode | null>(null);
  const [mode, setMode] = useState<"receipt" | "assembled">("receipt");
  const [activeFile, setActiveFile] = useState<string>("pipeline.py");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLiveReceipt(), getLiveAssembled()])
      .then(([r, a]) => {
        setReceipt(r);
        setAssembled(a);
        if (r?.files[0]) setActiveFile(r.entrypoint || r.files[0].name);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const file = useMemo(
    () => receipt?.files.find((f) => f.name === activeFile) ?? receipt?.files[0],
    [receipt, activeFile],
  );

  function download() {
    if (!receipt) return;
    const blob = zipSync(receipt.files.map((f) => ({ path: f.name, content: f.content })));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invariant_receipt.zip";
    a.click();
    URL.revokeObjectURL(url);
  }

  const cls = receipt?.reproducibilityClass ?? assembled?.reproducibilityClass;

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

      <p className="mt-2 max-w-[68ch] text-body text-ink-2">
        ADR-0002: the published code is not a sketch — it is a{" "}
        <span className="text-ink">parity-verified rendering of what the executor runs</span> (each operator&apos;s{" "}
        <span className="font-mono text-meta">emit()</span> is gated bit-identical against{" "}
        <span className="font-mono text-meta">execute()</span>). Below is the real output of{" "}
        <span className="font-mono text-meta">emit → assemble_dag → build_receipt</span>, served over{" "}
        <span className="font-mono text-meta">research-workbench (:8105)</span>. Clone it, point it at your data, get the same numbers.
      </p>

      {/* honesty label: which half is real, which is a placeholder */}
      <p className="mt-3 max-w-[72ch] border-l-2 border-clay/50 bg-clay-wash/40 px-3 py-2 text-meta text-ink-2">
        <span className="font-mono uppercase tracking-[0.1em] text-clay-deep">demo DAG</span> — the{" "}
        <span className="text-ink">code and receipt are real</span> (live codegen, parity-verified). The{" "}
        <span className="text-ink">input DAG</span> here is a labelled placeholder: stored artifacts carry DAG-<em>run</em>{" "}
        metadata, not the producing node graph, so there is no real DAG to package yet. That closes when the workspace builds the DAG itself (the build-stream).
      </p>

      {loading && <p className="mt-10 text-ui text-muted">Assembling receipt from dsl-engine…</p>}
      {error && (
        <p className="mt-10 text-ui text-clay">
          Could not reach research-workbench (:8105): <span className="font-mono text-meta">{error}</span>
        </p>
      )}

      {!loading && !error && receipt && (
        <div className="mt-7">
          {/* manifest strip */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-y border-hairline py-2.5 font-mono text-meta text-muted">
            <span>
              entrypoint <span className="text-ink-2">{receipt.entrypoint}</span> → <span className="text-ink-2">run({assembled?.inputIds.map((i) => `frame_${i.split(":")[1] ?? i}`).join(", ")})</span>
            </span>
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
                ⬇ invariant_receipt.zip
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
  );
}
