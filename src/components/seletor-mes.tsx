"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Opcao {
  valor: string; // "2026-07"
  rotulo: string; // "julho de 2026"
}

/**
 * Seletor de mês em forma de stepper: `‹ Julho 2026 ›`. Substitui os
 * dropdowns. A lista `meses` vem do mais recente para o mais antigo
 * (índice 0 = mês atual). ‹ recua no tempo, › avança.
 *
 * Com `permitirTodos`, existe um estado "Todos os meses" (valor "") logo a
 * seguir ao mês atual — avançar › a partir do mês atual mostra tudo.
 */
export function SeletorMes({
  meses,
  valor,
  aoMudar,
  permitirTodos = false,
}: {
  meses: Opcao[];
  valor: string;
  aoMudar: (valor: string) => void;
  permitirTodos?: boolean;
}) {
  const idx = valor === "" ? -1 : meses.findIndex((m) => m.valor === valor);
  const bruto = valor === "" ? "Todos os meses" : meses[idx]?.rotulo ?? valor;
  // Só a primeira letra maiúscula ("julho de 2026" → "Julho de 2026")
  const rotulo = bruto.charAt(0).toUpperCase() + bruto.slice(1);

  const podeRecuar = valor === "" ? meses.length > 0 : idx < meses.length - 1;
  const podeAvancar = valor === "" ? false : idx > 0 || permitirTodos;

  const recuar = () => {
    if (valor === "") aoMudar(meses[0]?.valor ?? "");
    else if (idx < meses.length - 1) aoMudar(meses[idx + 1].valor);
  };
  const avancar = () => {
    if (valor === "") return;
    if (idx === 0) {
      if (permitirTodos) aoMudar("");
    } else {
      aoMudar(meses[idx - 1].valor);
    }
  };

  const seta =
    "flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex items-center justify-between rounded-full border border-border/60 bg-card p-1 shadow-sm">
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={recuar}
        disabled={!podeRecuar}
        className={seta}
      >
        <ChevronLeft className="size-5" />
      </button>
      <span
        className={cn(
          "flex-1 text-center text-sm font-semibold tabular-nums",
          valor === "" && "text-muted-foreground"
        )}
      >
        {rotulo}
      </span>
      <button
        type="button"
        aria-label="Mês seguinte"
        onClick={avancar}
        disabled={!podeAvancar}
        className={seta}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
