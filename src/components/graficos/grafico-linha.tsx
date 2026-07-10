"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipGrafico } from "./tooltip-grafico";

export function GraficoLinha({
  dados,
}: {
  dados: { dia: string; saldo: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart
        accessibilityLayer={false}
        data={dados}
        margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
      >
        <defs>
          <linearGradient id="saldoGradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="dia"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          minTickGap={40}
          dy={6}
          stroke="var(--muted-foreground)"
        />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          content={<TooltipGrafico />}
          trigger="click"
          cursor={{
            stroke: "var(--muted-foreground)",
            strokeDasharray: "3 3",
            strokeOpacity: 0.4,
          }}
        />
        <Area
          type="monotone"
          dataKey="saldo"
          name="Saldo"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#saldoGradiente)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
