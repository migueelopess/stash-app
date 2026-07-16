"use client";

import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";

/** Mini-gráfico da projeção de saldo para os próximos dias. Fica vermelho se
 *  algum ponto cai abaixo de zero; senão verde. */
export function GraficoPrevisao({
  pontos,
  negativo,
}: {
  pontos: { data: string; saldo: number }[];
  negativo: boolean;
}) {
  const cor = negativo ? "#f43f5e" : "#10b981";
  return (
    <ResponsiveContainer width="100%" height={72}>
      <AreaChart
        accessibilityLayer={false}
        data={pontos}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="prevGradiente" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={cor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["auto", "auto"]} />
        {negativo && (
          <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.6} />
        )}
        <Area
          type="monotone"
          dataKey="saldo"
          stroke={cor}
          strokeWidth={2}
          fill="url(#prevGradiente)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
