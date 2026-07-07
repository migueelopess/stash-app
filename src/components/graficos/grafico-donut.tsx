"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

export function GraficoDonut({
  dados,
}: {
  dados: { name: string; valor: number; cor: string }[];
}) {
  const total = dados.reduce((soma, d) => soma + d.valor, 0);

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={dados}
            dataKey="valor"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            strokeWidth={0}
          >
            {dados.map((d) => (
              <Cell key={d.name} fill={d.cor} />
            ))}
          </Pie>
          <Tooltip
            formatter={(valor) => euros.format(Number(valor))}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex flex-col gap-1.5">
        {dados.map((d) => (
          <li
            key={d.name}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.cor }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {euros.format(d.valor)}
              {total > 0 && (
                <span className="ml-1 text-xs">
                  ({Math.round((d.valor / total) * 100)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
