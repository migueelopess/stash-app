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

/**
 * Gráfico do saldo com "scrubbing": arrastar o dedo pela linha mostra o
 * valor de cada ponto (estilo apps de bolsa). touch-action: pan-y deixa
 * o scroll vertical da página a funcionar — só o arrasto horizontal
 * segue a linha.
 */
export function GraficoLinha({
  dados,
}: {
  dados: { dia: string; saldo: number }[];
}) {
  return (
    <div style={{ touchAction: "pan-y" }}>
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
            isAnimationActive={false}
            cursor={{
              stroke: "#10b981",
              strokeWidth: 1.5,
              strokeDasharray: "4 4",
              strokeOpacity: 0.7,
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
            activeDot={{
              r: 5,
              strokeWidth: 3,
              stroke: "var(--card)",
              fill: "#10b981",
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
