// Agregações puras para o dashboard (sem dependências de servidor)

export interface TransacaoDash {
  id?: string;
  booking_date: string;
  amount: number;
  categoria: string | null;
  cor: string | null;
  icone?: string | null;
  descricao?: string | null;
  contraparte?: string | null;
  /** Nome pontual desta transação (exceção), tem prioridade na apresentação */
  nomePersonalizado?: string | null;
  /** Movimento (reembolso/transferência): não conta como gasto nem ganho */
  movimento?: boolean;
}

const formatoMesCurto = new Intl.DateTimeFormat("pt-PT", { month: "short" });
const formatoDiaCurto = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
});

function chaveMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Ganhos vs. gastos dos últimos nMeses (mais antigo primeiro). */
export function ganhosVsGastosPorMes(
  transacoes: TransacaoDash[],
  nMeses: number
): { mes: string; ganhos: number; gastos: number }[] {
  const meses: { chave: string; mes: string; ganhos: number; gastos: number }[] =
    [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < nMeses; i++) {
    meses.unshift({
      chave: chaveMes(d),
      mes: formatoMesCurto.format(d),
      ganhos: 0,
      gastos: 0,
    });
    d.setMonth(d.getMonth() - 1);
  }

  const porChave = new Map(meses.map((m) => [m.chave, m]));
  for (const t of transacoes) {
    if (t.movimento) continue;
    const m = porChave.get(t.booking_date.slice(0, 7));
    if (!m) continue;
    if (t.amount > 0) m.ganhos += t.amount;
    else m.gastos += -t.amount;
  }

  return meses.map(({ mes, ganhos, gastos }) => ({
    mes,
    ganhos: Math.round(ganhos * 100) / 100,
    gastos: Math.round(gastos * 100) / 100,
  }));
}

function somasPorCategoria(
  transacoes: TransacaoDash[],
  sinal: 1 | -1
): { name: string; valor: number; cor: string }[] {
  const mesAtual = chaveMes(new Date());
  const grupos = new Map<string, { valor: number; cor: string }>();

  for (const t of transacoes) {
    if (t.movimento) continue;
    if (t.amount * sinal <= 0 || t.booking_date.slice(0, 7) !== mesAtual) {
      continue;
    }
    const nome = t.categoria ?? "Por categorizar";
    const grupo = grupos.get(nome) ?? {
      valor: 0,
      cor: t.cor ?? "#94a3b8",
    };
    grupo.valor += Math.abs(t.amount);
    grupos.set(nome, grupo);
  }

  return [...grupos.entries()]
    .map(([name, { valor, cor }]) => ({
      name,
      valor: Math.round(valor * 100) / 100,
      cor,
    }))
    .sort((a, b) => b.valor - a.valor);
}

/** Gastos do mês atual agrupados por categoria (maiores primeiro). */
export function gastosPorCategoria(transacoes: TransacaoDash[]) {
  return somasPorCategoria(transacoes, -1);
}

/** Ganhos do mês atual agrupados por categoria (maiores primeiro). */
export function ganhosPorCategoria(transacoes: TransacaoDash[]) {
  return somasPorCategoria(transacoes, 1);
}

/** Evolução do saldo: recua a partir do saldo atual desfazendo as transações. */
export function serieDeSaldo(
  saldoAtual: number,
  transacoes: TransacaoDash[],
  dias: number
): { dia: string; saldo: number }[] {
  const pontos: { dia: string; saldo: number }[] = [];
  const hoje = new Date();
  // ~45 pontos independentemente do intervalo (7 dias → diário; 1 ano → semanal)
  const passo = Math.max(1, Math.round(dias / 45));

  for (let i = 0; i <= dias; i += passo) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (dias - i));
    const iso = d.toISOString().slice(0, 10);
    // saldo em d = saldo atual - tudo o que aconteceu depois de d
    const posteriores = transacoes
      .filter((t) => t.booking_date > iso)
      .reduce((soma, t) => soma + t.amount, 0);
    pontos.push({
      dia: formatoDiaCurto.format(d),
      saldo: Math.round((saldoAtual - posteriores) * 100) / 100,
    });
  }

  return pontos;
}

/** Soma do mês atual para uma categoria (por nome). */
export function somaDoMesPorCategoria(
  transacoes: TransacaoDash[],
  categoria: string
): number {
  const mesAtual = chaveMes(new Date());
  return transacoes
    .filter(
      (t) =>
        !t.movimento &&
        t.booking_date.slice(0, 7) === mesAtual &&
        t.categoria === categoria
    )
    .reduce((soma, t) => soma + t.amount, 0);
}

/** Maiores gastos do mês atual (mais caros primeiro). */
export function topGastosDoMes(
  transacoes: TransacaoDash[],
  n: number
): TransacaoDash[] {
  const mesAtual = chaveMes(new Date());
  return transacoes
    .filter(
      (t) =>
        !t.movimento &&
        t.amount < 0 &&
        t.booking_date.slice(0, 7) === mesAtual
    )
    .sort((a, b) => a.amount - b.amount)
    .slice(0, n);
}

/** Comparação de gastos: mês atual vs. mês anterior (até ao mesmo dia). */
export function comparacaoComMesAnterior(transacoes: TransacaoDash[]): {
  atual: number;
  anterior: number;
  diferenca: number;
} | null {
  const hoje = new Date();
  const diaLimite = hoje.getDate();
  const mesAtual = chaveMes(hoje);
  const dataAnterior = new Date(hoje);
  dataAnterior.setDate(1);
  dataAnterior.setMonth(dataAnterior.getMonth() - 1);
  const mesAnterior = chaveMes(dataAnterior);

  let atual = 0;
  let anterior = 0;
  for (const t of transacoes) {
    if (t.movimento || t.amount >= 0) continue;
    const mes = t.booking_date.slice(0, 7);
    const dia = Number(t.booking_date.slice(8, 10));
    if (mes === mesAtual) atual += -t.amount;
    else if (mes === mesAnterior && dia <= diaLimite) anterior += -t.amount;
  }

  if (atual === 0 && anterior === 0) return null;
  return { atual, anterior, diferenca: atual - anterior };
}

/** Ganhos, gastos e taxa de poupança do mês atual. */
export function resumoDoMes(transacoes: TransacaoDash[]): {
  ganhos: number;
  gastos: number;
  variacao: number;
  taxaPoupanca: number | null;
} {
  const mesAtual = chaveMes(new Date());
  let ganhos = 0;
  let gastos = 0;
  for (const t of transacoes) {
    if (t.movimento || t.booking_date.slice(0, 7) !== mesAtual) continue;
    if (t.amount > 0) ganhos += t.amount;
    else gastos += -t.amount;
  }
  return {
    ganhos,
    gastos,
    variacao: ganhos - gastos,
    taxaPoupanca: ganhos > 0 ? Math.round(((ganhos - gastos) / ganhos) * 100) : null,
  };
}
