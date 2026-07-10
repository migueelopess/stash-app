// Cálculos de orçamentos (puros — sem dependências de servidor)

export interface OrcamentoComCategoria {
  id: string;
  category_id: string | null; // null = orçamento global de gastos
  amount: number;
  period: "monthly" | "yearly";
  categories: { name: string; color: string | null; icon: string | null } | null;
}

export interface TransacaoParaOrcamento {
  booking_date: string;
  amount: number;
  category_id: string | null;
}

export interface EstadoOrcamento {
  orcamento: OrcamentoComCategoria;
  gasto: number;
  limite: number;
  restante: number;
  percentagem: number;
  nivel: "ok" | "aviso" | "ultrapassado"; // <75% | 75-100% | >100%
  ritmoDiario: number | null; // quanto pode gastar/dia até ao fim do período
  diasRestantes: number;
}

export function chavePeriodo(period: "monthly" | "yearly", agora = new Date()): string {
  return period === "monthly"
    ? `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`
    : String(agora.getFullYear());
}

function inicioDoPeriodo(period: "monthly" | "yearly", agora = new Date()): string {
  const inicio =
    period === "monthly"
      ? new Date(agora.getFullYear(), agora.getMonth(), 1)
      : new Date(agora.getFullYear(), 0, 1);
  // data local, sem fusos a baralhar o 1.º dia do mês
  return `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-01`;
}

function diasAteFimDoPeriodo(period: "monthly" | "yearly", agora = new Date()): number {
  const fim =
    period === "monthly"
      ? new Date(agora.getFullYear(), agora.getMonth() + 1, 1)
      : new Date(agora.getFullYear() + 1, 0, 1);
  return Math.max(
    1,
    Math.ceil((fim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
  );
}

/** Estado atual de um orçamento face às transações do ano. */
export function estadoDoOrcamento(
  orcamento: OrcamentoComCategoria,
  transacoes: TransacaoParaOrcamento[],
  agora = new Date()
): EstadoOrcamento {
  const inicio = inicioDoPeriodo(orcamento.period, agora);

  let gasto = 0;
  for (const t of transacoes) {
    if (t.amount >= 0 || t.booking_date < inicio) continue;
    if (
      orcamento.category_id !== null &&
      t.category_id !== orcamento.category_id
    ) {
      continue;
    }
    gasto += -t.amount;
  }

  const limite = Number(orcamento.amount);
  const restante = limite - gasto;
  const percentagem = limite > 0 ? (gasto / limite) * 100 : 0;
  const diasRestantes = diasAteFimDoPeriodo(orcamento.period, agora);

  return {
    orcamento,
    gasto: Math.round(gasto * 100) / 100,
    limite,
    restante: Math.round(restante * 100) / 100,
    percentagem,
    nivel:
      percentagem > 100 ? "ultrapassado" : percentagem >= 75 ? "aviso" : "ok",
    ritmoDiario:
      restante > 0 ? Math.round((restante / diasRestantes) * 100) / 100 : null,
    diasRestantes,
  };
}

export const CORES_NIVEL: Record<EstadoOrcamento["nivel"], string> = {
  ok: "#10b981",
  aviso: "#f59e0b",
  ultrapassado: "#f43f5e",
};

/** Nome apresentável do orçamento. */
export function nomeDoOrcamento(orcamento: OrcamentoComCategoria): string {
  return orcamento.categories?.name ?? "Todos os gastos";
}
