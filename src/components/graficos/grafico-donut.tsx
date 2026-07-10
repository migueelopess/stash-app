"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartInterativo } from "./chart-interativo";
import { TooltipGrafico } from "./tooltip-grafico";

const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const eurosInteiros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function GraficoDonut({
  dados,
}: {
  dados: { name: string; valor: number; cor: string }[];
}) {
  const total = dados.reduce((soma, d) => soma + d.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <ChartInterativo className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart accessibilityLayer={false}>
            <Pie
              data={dados}
              dataKey="valor"
              nameKey="name"
              innerRadius={64}
              outerRadius={88}
              paddingAngle={3}
              cornerRadius={8}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {dados.map((d) => (
                <Cell key={d.name} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip content={<TooltipGrafico />} trigger="click" />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Total
          </p>
          <p className="text-xl font-extrabold tabular-nums">
            {eurosInteiros.format(total)}
          </p>
        </div>
      </ChartInterativo>
      <ul className="flex flex-col gap-2.5">
        {dados.map((d) => {
          const percentagem = total > 0 ? (d.valor / total) * 100 : 0;
          return (
            <li key={d.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.cor }}
                  />
                  <span className="truncate font-medium">{d.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {euros.format(d.valor)}
                  <span className="ml-1 text-xs">
                    ({Math.round(percentagem)}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${percentagem}%`,
                    backgroundColor: d.cor,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
