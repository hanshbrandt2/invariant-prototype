"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

/** Editorial line chart — hairline axes, mono ticks, data-blue line. No grid, no fill. */
export function PreviewChart({
  data,
  color = "var(--color-data, #1F4E79)",
  height = 200,
}: {
  data: { t: string; v: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="t"
            tick={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: "#9A9388" }}
            axisLine={{ stroke: "#d8d0bf" }}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: "#9A9388" }}
            axisLine={false}
            tickLine={false}
            width={38}
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            contentStyle={{
              background: "#FAF7F1",
              border: "1px solid #1C1B18",
              borderRadius: 0,
              fontFamily: "var(--font-jetbrains)",
              fontSize: 11,
              boxShadow: "none",
            }}
            labelStyle={{ color: "#837c6e" }}
            cursor={{ stroke: "#be4d2b", strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <Line type="monotone" dataKey="v" stroke="#1F4E79" strokeWidth={1.5} dot={false} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
