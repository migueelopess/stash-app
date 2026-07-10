// Cálculos de orçamentos (puros — sem dependências de servidor)

export type Periodo = "weekly" | "monthly" | "yearly";

export interface OrcamentoComCategoria {
  id: string;
  category_id: string | null; // null = orçamento global de gastos
  amount: number;
  period: Periodo;
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
  projecao: number | null; // gasto estimado no fim do período, ao ritmo atual
}

const DIA_MS = 1000 * 60 * 60 * 24;

function segundaFeiraDa(agora: Date): Date {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // domingo=0 → recua 6
  return d;
}

function dataLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Identificador do período atual (para o dedupe de alertas). */
export function chavePeriodo(period: Periodo, agora = new Date()): string {
  if (period === "weekly") return `S${dataLocalIso(segundaFeiraDa(agora))}`;
  if (period === "monthly") {
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  }
  return String(agora.getFullYear());
}

function limitesDoPeriodo(
  period: Periodo,
  agora = new Date()
): { inicio: Date; fim: Date } {
  if (period === "weekly") {
    const inicio = segundaFeiraDa(agora);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 7);
    return { inicio, fim };
  }
  if (period === "monthly") {
    return {
      inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
      fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 1),
    };
  }
  return {
    inicio: new Date(agora.getFullYear(), 0, 1),
    fim: new Date(agora.getFullYear() + 1, 0, 1),
  };
}

/** Estado atual de um orçamento face às transações do ano. */
export function estadoDoOrcamento(
  orcamento: OrcamentoComCategoria,
  transacoes: TransacaoParaOrcamento[],
  agora = new Date()
): EstadoOrcamento {
  const { inicio, fim } = limitesDoPeriodo(orcamento.period, agora);
  const inicioIso = dataLocalIso(inicio);

  let gasto = 0;
  for (const t of transacoes) {
    if (t.amount >= 0 || t.booking_date < inicioIso) continue;
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
  const diasRestantes = Math.max(
    1,
    Math.ceil((fim.getTime() - agora.getTime()) / DIA_MS)
  );
  const diasTotais = Math.round((fim.getTime() - inicio.getTime()) / DIA_MS);
  const diasDecorridos = Math.max(1, diasTotais - diasRestantes + 1);

  // Projeção só quando já há dados suficientes para não ser ruído
  const minimoDias = orcamento.period === "weekly" ? 2 : 3;
  const projecao =
    diasDecorridos >= minimoDias && gasto > 0
      ? Math.round(((gasto / diasDecorridos) * diasTotais) * 100) / 100
      : null;

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
    projecao,
  };
}

export const CORES_NIVEL: Record<EstadoOrcamento["nivel"], string> = {
  ok: "#10b981",
  aviso: "#f59e0b",
  ultrapassado: "#f43f5e",
};

export const ROTULOS_PERIODO: Record<Periodo, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

export const FIM_PERIODO: Record<Periodo, string> = {
  weekly: "da semana",
  monthly: "do mês",
  yearly: "do ano",
};

/** Nome apresentável do orçamento. */
export function nomeDoOrcamento(orcamento: OrcamentoComCategoria): string {
  return orcamento.categories?.name ?? "Todos os gastos";
}

/**
 * Média mensal de gasto por categoria nos últimos 3 meses completos
 * (para sugerir limites a categorias sem orçamento).
 */
export function mediaMensalPorCategoria(
  transacoes: TransacaoParaOrcamento[],
  agora = new Date()
): Map<string, number> {
  const inicio = new Date(agora.getFullYear(), agora.getMonth() - 3, 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicioIso = dataLocalIso(inicio);
  const fimIso = dataLocalIso(fim);

  const somas = new Map<string, number>();
  for (const t of transacoes) {
    if (t.amount >= 0 || !t.category_id) continue;
    if (t.booking_date < inicioIso || t.booking_date >= fimIso) continue;
    somas.set(t.category_id, (somas.get(t.category_id) ?? 0) + -t.amount);
  }

  const medias = new Map<string, number>();
  for (const [categoria, soma] of somas) {
    medias.set(categoria, Math.round((soma / 3) * 100) / 100);
  }
  return medias;
}
