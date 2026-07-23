"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SeletorMes } from "@/components/seletor-mes";

interface Opcao {
  valor: string;
  rotulo: string;
}

/** Stepper de mês das transações (com estado "Todos os meses"). */
export function FiltrosTransacoes({ meses }: { meses: Opcao[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const definirMes = (valor: string) => {
    const novos = new URLSearchParams(params.toString());
    if (valor) novos.set("mes", valor);
    else novos.delete("mes");
    novos.delete("n");
    novos.delete("sync");
    novos.delete("novas");
    router.push(`/transacoes?${novos.toString()}`);
  };

  return (
    <SeletorMes
      meses={meses}
      valor={params.get("mes") ?? ""}
      aoMudar={definirMes}
      permitirTodos
    />
  );
}
