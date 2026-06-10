"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtCell, isNumericType } from "@/lib/format";

type Field = { name: string; type: string };
type Profile = { fileName: string; rows: number; fields: Field[]; sample: Record<string, string>[] };

/** Infer a coarse dtype from a sample value — enough to render an honest schema. */
function inferType(v: string): string {
  const s = v.trim();
  if (s === "") return "string";
  if (/^-?\d+$/.test(s)) return "int64";
  if (/^-?\d*\.\d+$/.test(s)) return "float64";
  if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2})?/.test(s)) return "timestamp";
  if (/^(true|false)$/i.test(s)) return "bool";
  return "string";
}

/** Parse a CSV string into a profile: header → fields (typed from row 1), first
 *  rows as a sample, total data-row count. Naive comma split — honest for the
 *  preview; real ingest replaces this. */
function profileCsv(name: string, text: string): Profile {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
  const header = (lines[0] ?? "").split(",").map((h) => h.trim());
  const dataLines = lines.slice(1);
  const cells = (l: string) => l.split(",");
  const first = dataLines[0] ? cells(dataLines[0]) : [];
  const fields: Field[] = header.map((name, i) => ({ name: name || `col_${i + 1}`, type: inferType(first[i] ?? "") }));
  const sample = dataLines.slice(0, 8).map((l) => {
    const c = cells(l);
    const row: Record<string, string> = {};
    fields.forEach((f, i) => (row[f.name] = (c[i] ?? "").trim()));
    return row;
  });
  return { fileName: name, rows: dataLines.length, fields, sample };
}

/**
 * Bring-your-own-data (preview). Reads a CSV in the browser, profiles it
 * (schema + sample), and shows the result — the same legible surface a hosted
 * dataset gets. Honestly labelled: the file never leaves the browser and isn't
 * persisted; real ingest + storage land with the backend.
 */
export function UploadData() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setProfile(null); setError(null); setBusy(false); };
  const close = () => { setOpen(false); reset(); };

  const onFile = (file: File) => {
    setBusy(true);
    setError(null);
    file
      .text()
      .then((text) => {
        const p = profileCsv(file.name, text);
        if (!p.fields.length || p.rows === 0) { setError("Couldn't read columns from that file — expected a CSV with a header row."); setBusy(false); return; }
        setProfile(p);
        setBusy(false);
      })
      .catch(() => { setError("Couldn't read that file."); setBusy(false); });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-hairline-2 px-3.5 py-2 text-ui text-muted hover:border-ink hover:text-ink transition-colors"
      >
        <span className="font-mono text-ui text-clay">↑</span>
        Bring your own data
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 pt-[8vh]">
          <button aria-label="dismiss" onClick={close} className="absolute inset-0 bg-ink/20 backdrop-blur-[2px] cursor-default" />
          <div className="relative w-full max-w-[600px] rounded-2xl bg-white shadow-float border border-hairline overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
              <div>
                <h2 className="font-serif text-h2 font-semibold leading-none">Bring your own data</h2>
                <p className="mt-1.5 font-mono text-meta text-faint">preview · parsed in your browser, not uploaded or stored</p>
              </div>
              <button onClick={close} aria-label="close" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-paper-2 hover:text-clay text-h3 leading-none">×</button>
            </div>

            <div className="p-6">
              {!profile ? (
                <div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-hairline-2 hover:border-clay transition-colors py-10 px-6 text-center"
                  >
                    <div className="font-mono text-h2 text-clay">↑</div>
                    <div className="mt-2 text-body text-ink">{busy ? "Profiling…" : "Choose a CSV file"}</div>
                    <div className="mt-1 font-mono text-meta text-faint">header row + columns · we infer the schema</div>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                  />
                  {error && <p className="mt-3 text-ui text-clay">{error}</p>}
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="font-mono text-ui text-ink truncate">{profile.fileName}</span>
                    <span className="font-mono text-meta text-faint">{profile.fields.length} cols · {profile.rows.toLocaleString()} rows</span>
                  </div>

                  <p className="eyebrow mb-1.5">detected schema</p>
                  <div className="rounded-lg border border-hairline bg-white overflow-hidden mb-4">
                    <table className="w-full text-ui font-mono">
                      <tbody>
                        {profile.fields.map((f) => (
                          <tr key={f.name} className="border-b border-hairline/50 last:border-0">
                            <td className="px-3 py-1.5 text-ink">{f.name}</td>
                            <td className="px-3 py-1.5 text-clay text-right">{f.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="eyebrow mb-1.5">sample · {profile.sample.length} of {profile.rows.toLocaleString()} rows</p>
                  <div className="rounded-lg border border-hairline bg-white overflow-x-auto">
                    <table className="w-full text-meta font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-hairline text-faint">
                          {profile.fields.map((f) => (
                            <th key={f.name} className={`font-normal px-2.5 py-1.5 whitespace-nowrap ${isNumericType(f.type) ? "text-right" : "text-left"}`}>{f.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {profile.sample.map((row, i) => (
                          <tr key={i} className="border-b border-hairline/50 last:border-0 text-ink-2">
                            {profile.fields.map((f) => (
                              <td key={f.name} className={`px-2.5 py-1 whitespace-nowrap ${isNumericType(f.type) ? "text-right tabular-nums" : ""}`}>{fmtCell(row[f.name] === "" ? null : row[f.name])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <button onClick={reset} className="font-mono text-meta text-muted hover:text-ink">← choose another</button>
                    <button
                      onClick={() => { close(); router.push("/workspace/new"); }}
                      className="font-mono text-meta uppercase tracking-[0.12em] bg-ink text-paper px-4 py-2 rounded-lg hover:bg-clay transition-colors"
                    >
                      start analysis →
                    </button>
                  </div>
                  <p className="mt-3 font-mono text-meta text-faint leading-relaxed">
                    in the prototype the profile stays in this dialog. with the backend, this registers as a hosted dataset you can build on.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
