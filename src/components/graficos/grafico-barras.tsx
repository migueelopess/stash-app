"use client";

import {
  Bar,
  BarChart,
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

export function GraficoBarras({
  dados,
}: {
  dados: { mes: string; ganhos: number; gastos: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="mes"
          tickLine={false}
          axisLine={false}
          fontSize={12}
          stroke="var(--muted-foreground)"
        />
        <YAxis hide />
        <Tooltip
          formatter={(valor, nome) => [
            euros.format(Number(valor)),
            nome === "ganhos" ? "Ganhos" : "Gastos",
          ]}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        <Bar dataKey="ganhos" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
