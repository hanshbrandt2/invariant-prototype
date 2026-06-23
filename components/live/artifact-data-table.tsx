"use client";

// components/live/artifact-data-table.tsx — REAL row inspection for a live
// artifact, via ag-grid (community). The rows are a labeled SAMPLE (first ≤500
// of total — the :8105 preview endpoint caps there and has no offset paging), so
// the header says exactly that. ag-grid earns its place with sort / filter /
// resize / CSV over the sample; the design is themed to the editorial system
// (warm paper, ink, hairline, mono data) through the Theming API — no CSS import,
// nothing to override.

import { useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";
import type { LiveArtifactPreview } from "@/lib/types";
import { getLiveArtifactPreview } from "@/lib/data";
import { ServiceDown } from "@/components/live/service-down";

ModuleRegistry.registerModules([AllCommunityModule]);

// The editorial grid theme — paper/ink/hairline, JetBrains Mono for data, clay
// as the single accent. Mirrors lib/theme/editorial.ts tokens.
const editorialGrid = themeQuartz.withParams({
  accentColor: "#BE4D2B",
  backgroundColor: "#FAF7F1",
  foregroundColor: "#1C1B18",
  borderColor: "#E7E1D5",
  chromeBackgroundColor: "#F4EFE6",
  headerBackgroundColor: "#F4EFE6",
  headerTextColor: "#6B6557",
  oddRowBackgroundColor: "transparent",
  rowHoverColor: "#F1EADD",
  browserColorScheme: "light",
  fontFamily: "var(--font-jetbrains), ui-monospace, monospace",
  fontSize: 12,
  headerHeight: 36,
  rowHeight: 30,
  cellHorizontalPadding: 12,
  wrapperBorderRadius: 0,
  borderRadius: 2,
});

const NUMERIC = /^(Float|U?Int|Decimal)/;
const TEMPORAL = /^(Datetime|Date|Time)/;

function widthFor(dtype: string): number {
  if (TEMPORAL.test(dtype)) return 190;
  if (NUMERIC.test(dtype)) return 110;
  return 150;
}

export function ArtifactDataTable({ artifactId }: { artifactId: string }) {
  const [preview, setPreview] = useState<LiveArtifactPreview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setErr(null);
    setPreview(null);
    getLiveArtifactPreview(artifactId)
      .then((p) => live && setPreview(p ?? null))
      .catch((e) => live && setErr(String(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [artifactId]);

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!preview) return [];
    return preview.columns.map((col, i) => {
      const numeric = NUMERIC.test(col.dtype);
      return {
        headerName: col.name,
        field: String(i), // rows are positional arrays → field is the index
        type: numeric ? "rightAligned" : undefined,
        filter: numeric ? "agNumberColumnFilter" : "agTextColumnFilter",
        cellClass: numeric ? "tabular-nums" : undefined,
        headerTooltip: `${col.name} · ${col.dtype}`,
        width: widthFor(col.dtype),
        valueFormatter: (p) => (p.value == null ? "—" : String(p.value)),
      } satisfies ColDef;
    });
  }, [preview]);

  const rowData = useMemo(() => {
    if (!preview) return [];
    return preview.rows.map((r) => {
      const o: Record<string, unknown> = {};
      r.forEach((v, i) => (o[String(i)] = v));
      return o;
    });
  }, [preview]);

  if (loading) return <p className="text-ui text-muted">Loading the data sample…</p>;
  if (err)
    return <ServiceDown service="research-workbench" port={8105} error={err} reach="local" />;
  if (!preview) return <p className="text-ui text-muted">No data preview for this artifact.</p>;

  // Status-discriminated 200: the artifact has no materialized rows to read.
  if (preview.status !== "ok") {
    return (
      <div className="border border-hairline bg-paper-2/40 p-4">
        <p className="text-ui text-ink-2">
          No tabular data for this artifact{" "}
          <span className="font-mono text-meta text-muted">(status: {preview.status})</span>.
        </p>
        <p className="mt-1 text-meta text-faint">
          Only artifacts with a materialized output blob (datasets, features, matrices,
          targets) return rows. Models, strategies and results carry spec + lineage only.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="eyebrow">Data</p>
        <p className="text-meta text-muted">
          <span className="text-ink-2">sample · {rowData.length.toLocaleString()}</span> of{" "}
          <span className="font-mono">{preview.totalRows.toLocaleString()}</span> rows
          {preview.truncated && " · truncated"}
        </p>
        <span className="inline-flex items-center gap-1.5 border border-green/40 bg-green/5 px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-green">
          <span className="h-1.5 w-1.5 rounded-full bg-green" /> real · research-workbench
        </span>
      </div>
      <div style={{ height: 540 }}>
        <AgGridReact
          theme={editorialGrid}
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={{ sortable: true, resizable: true, filter: true, minWidth: 90 }}
          pagination
          paginationPageSize={50}
          paginationPageSizeSelector={[50, 100, 200]}
          suppressCellFocus
          animateRows={false}
          enableCellTextSelection
          tooltipShowDelay={300}
        />
      </div>
      <p className="mt-2 text-meta text-faint">
        Sorted in artifact-write order. The preview endpoint caps at 500 rows and has no
        row paging — for full-population shape see the <span className="text-ink-2">Distributions</span> tab.
      </p>
    </div>
  );
}
