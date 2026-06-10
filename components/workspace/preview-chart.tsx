"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { editorial } from "@/lib/theme/editorial";

const c = editorial.color;

/** Editorial line chart — hairline axes, mono ticks, data-blue line. No grid, no fill. */
export function PreviewChart({
  data,
  color = c.data,
  height = 200,
}: {
  data: { t: string; v: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <XAxis
            dataKey="t"
            tick={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: c.faint }}
            axisLine={{ stroke: c.hairline2 }}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8))}
          />
          <YAxis
            tick={{ fontFamily: "var(--font-jetbrains)", fontSize: 9, fill: c.faint }}
            axisLine={false}
            tickLine={false}
            width={46}
            allowDecimals={false}
            tickFormatter={(v: number) => `${Math.round(v)}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: c.paper,
              border: `1px solid ${c.ink}`,
              borderRadius: 0,
              fontFamily: "var(--font-jetbrains)",
              fontSize: 11,
              boxShadow: "none",
            }}
            labelStyle={{ color: c.muted }}
            cursor={{ stroke: c.clay, strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} animationDuration={700} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
