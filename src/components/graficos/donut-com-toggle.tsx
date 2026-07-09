"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { GraficoDonut } from "./grafico-donut";

interface Fatia {
  name: string;
  valor: number;
  cor: string;
}

/** Donut de gastos/ganhos do mês com toggle segmentado no topo. */
export function DonutComToggle({
  gastos,
  ganhos,
}: {
  gastos: Fatia[];
  ganhos: Fatia[];
}) {
  const [vista, setVista] = useState<"gastos" | "ganhos">("gastos");
  const dados = vista === "gastos" ? gastos : ganhos;

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Tipo de movimentos"
        className="grid grid-cols-2 gap-1 self-center rounded-full bg-muted p-1"
      >
        {(
          [
            ["gastos", "Gastos"],
            ["ganhos", "Ganhos"],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            role="tab"
            aria-selected={vista === valor}
            onClick={() => setVista(valor)}
            className={cn(
              "rounded-full px-4 py-1 text-xs font-semibold transition-all",
              vista === valor
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {dados.length > 0 ? (
        <div
          key={vista}
          className="animate-in fade-in-0 duration-300"
        >
          <GraficoDonut dados={dados} />
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {vista === "gastos"
            ? "Sem gastos este mês. 🎉"
            : "Sem ganhos este mês."}
        </p>
      )}
    </div>
  );
}
