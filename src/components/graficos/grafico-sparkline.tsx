"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

/** Mini-gráfico de área para o hero do dashboard (sem eixos nem tooltip). */
export function GraficoSparkline({
  dados,
}: {
  dados: { dia: string; saldo: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart
        accessibilityLayer={false}
        data={dados}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="sparkGradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity={0.35} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["auto", "auto"]} />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={2}
          fill="url(#sparkGradiente)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
