// Comparações do mês atual com os meses anteriores (puras e testáveis).
// Regra de justiça: compara sempre o mês atual ATÉ AO DIA DE HOJE com o mesmo
// intervalo de dias (1..dia) dos meses anteriores — senão um mês incompleto
// pareceria sempre menor que meses completos.

import type { TransacaoDash } from "./dashboard";

function chaveMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function diaDe(booking_date: string): number {
  return Number(booking_date.slice(8, 10));
}

/** Meses anteriores (mais recente primeiro) com pelo menos uma transação. */
function mesesBase(
  transacoes: TransacaoDash[],
  mesAtual: string,
  nMeses: number
): string[] {
  const comDados = new Set<string>();
  for (const t of transacoes) {
    const m = t.booking_date.slice(0, 7);
    if (m < mesAtual) comDados.add(m);
  }
  return [...comDados].sort((a, b) => (a < b ? 1 : -1)).slice(0, nMeses);
}

export interface ComparacaoCategoria {
  categoria: string;
  cor: string;
  icone: string | null;
  atual: number; // gasto este mês até hoje
  media: number; // média do mesmo intervalo nos meses base
  diferenca: number; // atual - media
  pct: number | null; // variação % (null quando não havia base)
}

/**
 * Gasto por categoria: mês atual (até hoje) vs média do mesmo intervalo nos
 * últimos `nMeses` meses com dados. Ordenado do maior aumento ao maior corte.
 */
export function compararCategorias(
  transacoes: TransacaoDash[],
  agora = new Date(),
  nMeses = 3
): { categorias: ComparacaoCategoria[]; nMesesBase: number } {
  const mesAtual = chaveMes(agora);
  const diaLimite = agora.getDate();
  const base = mesesBase(transacoes, mesAtual, nMeses);
  const baseSet = new Set(base);

  const meta = new Map<string, { cor: string; icone: string | null }>();
  const atualPorCat = new Map<string, number>();
  // soma por categoria em cada mês base (para a média)
  const basePorCat = new Map<string, Map<string, number>>();

  for (const t of transacoes) {
    if (t.movimento || t.amount >= 0) continue;
    if (diaDe(t.booking_date) > diaLimite) continue;
    const cat = t.categoria ?? "Por categorizar";
    const mes = t.booking_date.slice(0, 7);
    const valor = Math.abs(t.amount);
    if (!meta.has(cat)) {
      meta.set(cat, { cor: t.cor ?? "#94a3b8", icone: t.icone ?? null });
    }
    if (mes === mesAtual) {
      atualPorCat.set(cat, (atualPorCat.get(cat) ?? 0) + valor);
    } else if (baseSet.has(mes)) {
      const porMes = basePorCat.get(cat) ?? new Map<string, number>();
      porMes.set(mes, (porMes.get(mes) ?? 0) + valor);
      basePorCat.set(cat, porMes);
    }
  }

  const nBase = base.length;
  const cats = new Set<string>([...atualPorCat.keys(), ...basePorCat.keys()]);
  const categorias: ComparacaoCategoria[] = [];

  for (const cat of cats) {
    const atual = Math.round((atualPorCat.get(cat) ?? 0) * 100) / 100;
    const somaBase = [...(basePorCat.get(cat)?.values() ?? [])].reduce(
      (s, v) => s + v,
      0
    );
    const media = nBase > 0 ? Math.round((somaBase / nBase) * 100) / 100 : 0;
    if (atual === 0 && media === 0) continue;
    const diferenca = Math.round((atual - media) * 100) / 100;
    const pct = media > 0 ? Math.round((diferenca / media) * 100) : null;
    const info = meta.get(cat) ?? { cor: "#94a3b8", icone: null };
    categorias.push({
      categoria: cat,
      cor: info.cor,
      icone: info.icone,
      atual,
      media,
      diferenca,
      pct,
    });
  }

  categorias.sort((a, b) => b.diferenca - a.diferenca);
  return { categorias, nMesesBase: nBase };
}

export interface ResumoComparativo {
  diaLimite: number;
  diasNoMes: number;
  gastoAtual: number;
  gastoMedia: number;
  gastoDif: number;
  gastoPct: number | null;
  projecao: number; // gasto estimado no fim do mês ao ritmo atual
  ganhoAtual: number;
  ganhoMedia: number;
  poupancaAtual: number | null; // taxa de poupança % este mês
  poupancaMedia: number | null;
}

/** Totais comparativos (gastos, ganhos, poupança) mês atual vs média base. */
export function resumoComparativo(
  transacoes: TransacaoDash[],
  agora = new Date(),
  nMeses = 3
): ResumoComparativo | null {
  const mesAtual = chaveMes(agora);
  const diaLimite = agora.getDate();
  const diasNoMes = new Date(
    agora.getFullYear(),
    agora.getMonth() + 1,
    0
  ).getDate();
  const base = mesesBase(transacoes, mesAtual, nMeses);
  if (base.length === 0) return null;
  const baseSet = new Set(base);

  let gastoAtual = 0;
  let ganhoAtual = 0;
  const gastoBase = new Map<string, number>();
  const ganhoBase = new Map<string, number>();

  for (const t of transacoes) {
    if (t.movimento) continue;
    if (diaDe(t.booking_date) > diaLimite) continue;
    const mes = t.booking_date.slice(0, 7);
    const gasto = t.amount < 0 ? -t.amount : 0;
    const ganho = t.amount > 0 ? t.amount : 0;
    if (mes === mesAtual) {
      gastoAtual += gasto;
      ganhoAtual += ganho;
    } else if (baseSet.has(mes)) {
      if (gasto) gastoBase.set(mes, (gastoBase.get(mes) ?? 0) + gasto);
      if (ganho) ganhoBase.set(mes, (ganhoBase.get(mes) ?? 0) + ganho);
    }
  }

  const n = base.length;
  const media = (m: Map<string, number>) =>
    Math.round(([...m.values()].reduce((s, v) => s + v, 0) / n) * 100) / 100;
  const gastoMedia = media(gastoBase);
  const ganhoMedia = media(ganhoBase);

  const taxa = (ganho: number, gasto: number) =>
    ganho > 0 ? Math.round(((ganho - gasto) / ganho) * 100) : null;

  return {
    diaLimite,
    diasNoMes,
    gastoAtual: Math.round(gastoAtual * 100) / 100,
    gastoMedia,
    gastoDif: Math.round((gastoAtual - gastoMedia) * 100) / 100,
    gastoPct:
      gastoMedia > 0
        ? Math.round(((gastoAtual - gastoMedia) / gastoMedia) * 100)
        : null,
    projecao:
      diaLimite > 0
        ? Math.round((gastoAtual / diaLimite) * diasNoMes * 100) / 100
        : gastoAtual,
    ganhoAtual: Math.round(ganhoAtual * 100) / 100,
    ganhoMedia,
    poupancaAtual: taxa(ganhoAtual, gastoAtual),
    poupancaMedia: taxa(ganhoMedia, gastoMedia),
  };
}
