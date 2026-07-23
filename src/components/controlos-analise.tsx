"use client";

import { useRouter } from "next/navigation";
import { SeletorMes } from "@/components/seletor-mes";
import { cn } from "@/lib/utils";

interface Opcao {
  valor: string;
  rotulo: string;
}

/**
 * Controlos da página de Análise: escolher o mês (stepper com setas) e o tipo
 * (gastos/ganhos). Navega por searchParams (sem estado no cliente) — mudar o
 * mês/tipo limpa o drill-in de categoria.
 */
export function ControlosAnalise({
  meses,
  mes,
  tipo,
}: {
  meses: Opcao[];
  mes: string;
  tipo: "gastos" | "ganhos";
}) {
  const router = useRouter();

  const ir = (novoMes: string, novoTipo: string) => {
    const p = new URLSearchParams();
    p.set("mes", novoMes);
    p.set("tipo", novoTipo);
    router.push(`/analise?${p.toString()}`);
  };

  const pill = (ativo: boolean) =>
    cn(
      "h-9 flex-1 rounded-full text-sm font-semibold transition-colors",
      ativo
        ? "bg-card text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex rounded-full bg-muted p-1">
        <button
          type="button"
          onClick={() => ir(mes, "gastos")}
          className={pill(tipo === "gastos")}
        >
          Gastos
        </button>
        <button
          type="button"
          onClick={() => ir(mes, "ganhos")}
          className={pill(tipo === "ganhos")}
        >
          Ganhos
        </button>
      </div>
      <SeletorMes meses={meses} valor={mes} aoMudar={(m) => ir(m, tipo)} />
    </div>
  );
}
