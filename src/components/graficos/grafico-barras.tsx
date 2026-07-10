"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipGrafico } from "./tooltip-grafico";

const COR_GANHOS = "#10b981";
const COR_GASTOS = "#fb7185";

export function GraficoBarras({
  dados,
}: {
  dados: { mes: string; ganhos: number; gastos: number }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          accessibilityLayer={false}
          data={dados}
          margin={{ top: 12, right: 4, left: 4, bottom: 0 }}
          barGap={5}
        >
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            dy={6}
            stroke="var(--muted-foreground)"
          />
          <YAxis hide />
          <Tooltip
            content={<TooltipGrafico />}
            trigger="click"
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar
            dataKey="ganhos"
            name="Ganhos"
            fill={COR_GANHOS}
            radius={[99, 99, 99, 99]}
            barSize={10}
          />
          <Bar
            dataKey="gastos"
            name="Gastos"
            fill={COR_GASTOS}
            radius={[99, 99, 99, 99]}
            barSize={10}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: COR_GANHOS }}
          />
          Ganhos
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: COR_GASTOS }}
          />
          Gastos
        </span>
      </div>
    </div>
  );
}
