"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  name: string | null;
  iban: string | null;
}

interface Opcao {
  valor: string;
  rotulo: string;
}

/** Fila horizontal de filtros em pills — aplicam-se logo ao escolher. */
export function FiltrosTransacoes({
  contas,
  meses,
}: {
  contas: Conta[];
  meses: Opcao[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const definir = (chave: string, valor: string) => {
    const novos = new URLSearchParams(params.toString());
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    // recomeçar paginação e limpar mensagens ao mudar filtros
    novos.delete("n");
    novos.delete("sync");
    novos.delete("novas");
    router.push(`/transacoes?${novos.toString()}`);
  };

  const pill = (ativo: boolean) =>
    cn(
      "h-9 shrink-0 rounded-full border px-3 text-sm font-medium shadow-sm transition-colors",
      ativo
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border/60 bg-card text-foreground"
    );

  const mes = params.get("mes") ?? "";
  const tipo = params.get("tipo") ?? "";
  const conta = params.get("conta") ?? "";

  return (
    <div className="sem-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
      <select
        aria-label="Mês"
        value={mes}
        onChange={(e) => definir("mes", e.target.value)}
        className={pill(mes !== "")}
      >
        <option value="">Todos os meses</option>
        {meses.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.rotulo}
          </option>
        ))}
      </select>
      <select
        aria-label="Tipo"
        value={tipo}
        onChange={(e) => definir("tipo", e.target.value)}
        className={pill(tipo !== "")}
      >
        <option value="">Ganhos e gastos</option>
        <option value="ganhos">Só ganhos</option>
        <option value="gastos">Só gastos</option>
        <option value="movimentos">Só movimentos</option>
      </select>
      {contas.length > 1 && (
        <select
          aria-label="Conta"
          value={conta}
          onChange={(e) => definir("conta", e.target.value)}
          className={pill(conta !== "")}
        >
          <option value="">Todas as contas</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.iban ?? "Conta"}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
