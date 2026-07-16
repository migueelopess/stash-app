// Cálculos de orçamentos (puros — sem dependências de servidor)

export type Periodo = "weekly" | "monthly" | "yearly";

export interface OrcamentoComCategoria {
  id: string;
  category_id: string | null; // null = orçamento global de gastos
  amount: number;
  period: Periodo;
  start_date: string; // âncora: a janela rola a partir deste dia (ISO)
  /** Instante exato da criação — tudo o que já estava na app nessa altura
   *  não conta, para o orçamento começar vazio. */
  start_at?: string | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

export interface TransacaoParaOrcamento {
  booking_date: string;
  amount: number;
  category_id: string | null;
  /** Momento em que a transação entrou na app (sync). O banco não dá hora. */
  created_at?: string | null;
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

function dataLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Meia-noite local a partir de uma data ISO "YYYY-MM-DD". */
function diaLocalDeIso(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

/** Soma n meses mantendo o dia do mês, encolhendo se o mês for mais curto. */
function somarMeses(base: Date, n: number): Date {
  const total = base.getMonth() + n;
  const ano = base.getFullYear() + Math.floor(total / 12);
  const mes = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(base.getDate(), ultimoDia));
}

/**
 * Janela atual do orçamento, ancorada em `anchorIso` (dia de criação) e a
 * rolar: semanal = blocos de 7 dias; mensal = mesmo dia de cada mês; anual =
 * aniversário. Devolve o bloco que contém `agora`.
 */
function limitesDoPeriodo(
  period: Periodo,
  anchorIso: string,
  agora = new Date()
): { inicio: Date; fim: Date } {
  const anchor = diaLocalDeIso(anchorIso);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  if (period === "weekly") {
    const blocos = Math.max(
      0,
      Math.floor((hoje.getTime() - anchor.getTime()) / (7 * DIA_MS))
    );
    const inicio = new Date(anchor);
    inicio.setDate(inicio.getDate() + blocos * 7);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 7);
    return { inicio, fim };
  }

  const passo = period === "monthly" ? 1 : 12;
  const mesesDesdeAncora =
    (hoje.getFullYear() - anchor.getFullYear()) * 12 +
    (hoje.getMonth() - anchor.getMonth());
  // Arredondar para baixo ao passo e garantir inicio <= hoje
  let n = Math.floor(mesesDesdeAncora / passo) * passo;
  if (somarMeses(anchor, n) > hoje) n -= passo;
  const inicio = somarMeses(anchor, n);
  const fim = somarMeses(anchor, n + passo);
  return { inicio, fim };
}

/** Identificador do período atual (para o dedupe de alertas). */
export function chavePeriodo(
  period: Periodo,
  anchorIso: string,
  agora = new Date()
): string {
  const { inicio } = limitesDoPeriodo(period, anchorIso, agora);
  return dataLocalIso(inicio);
}

/** Estado atual de um orçamento face às transações do ano. */
export function estadoDoOrcamento(
  orcamento: OrcamentoComCategoria,
  transacoes: TransacaoParaOrcamento[],
  agora = new Date()
): EstadoOrcamento {
  const { inicio, fim } = limitesDoPeriodo(
    orcamento.period,
    orcamento.start_date,
    agora
  );
  const inicioIso = dataLocalIso(inicio);

  let gasto = 0;
  for (const t of transacoes) {
    if (t.amount >= 0 || t.booking_date < inicioIso) continue;
    // Arranque vazio: o que já estava na app quando o orçamento foi criado
    // nunca conta (ex.: compras de ontem que só hoje caíram na conta).
    if (
      orcamento.start_at &&
      t.created_at &&
      t.created_at < orcamento.start_at
    ) {
      continue;
    }
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
