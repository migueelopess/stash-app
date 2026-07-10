"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GraficoLinha } from "./grafico-linha";

export type Intervalo = "7d" | "1m" | "3m" | "6m" | "1a";

const INTERVALOS: { valor: Intervalo; rotulo: string }[] = [
  { valor: "7d", rotulo: "7D" },
  { valor: "1m", rotulo: "1M" },
  { valor: "3m", rotulo: "3M" },
  { valor: "6m", rotulo: "6M" },
  { valor: "1a", rotulo: "1A" },
];

/** Evolução do saldo com seletor de intervalo por baixo (estilo bolsa). */
export function GraficoSaldoIntervalos({
  series,
}: {
  series: Record<Intervalo, { dia: string; saldo: number }[]>;
}) {
  const [intervalo, setIntervalo] = useState<Intervalo>("3m");

  return (
    <div className="flex flex-col gap-2">
      <div key={intervalo} className="animate-in fade-in-0 duration-300">
        <GraficoLinha dados={series[intervalo]} />
      </div>
      <div
        role="tablist"
        aria-label="Intervalo do gráfico"
        className="flex gap-1 self-center rounded-full bg-muted p-1"
      >
        {INTERVALOS.map(({ valor, rotulo }) => (
          <button
            key={valor}
            role="tab"
            aria-selected={intervalo === valor}
            onClick={() => setIntervalo(valor)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all",
              intervalo === valor
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
