"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export function GraficoLinha({
  dados,
}: {
  dados: { dia: string; saldo: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="saldoGradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="dia"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          minTickGap={32}
          stroke="var(--muted-foreground)"
        />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          formatter={(valor) => [euros.format(Number(valor)), "Saldo"]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#saldoGradiente)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
