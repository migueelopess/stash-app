// Comparações do mês com meses anteriores (puras e testáveis).
// Justiça: se o mês alvo é o atual, compara só ATÉ AO DIA DE HOJE com o mesmo
// intervalo (1..dia) dos meses base; se é um mês passado, compara o mês inteiro
// com meses inteiros. Movimentos nunca contam.

export type TipoAnalise = "gastos" | "ganhos";

export interface TxAnalise {
  booking_date: string;
  amount: number;
  movimento: boolean;
  categoria: string | null;
  categoryId: string | null;
  cor: string;
  icone: string | null;
  chave: string | null; // comerciante (chaveDoNome)
  nomeComerciante: string;
}

export interface ItemComparado {
  chave: string; // categoryId ("__none__") ou chave do comerciante
  rotulo: string;
  cor: string;
  icone: string | null;
  atual: number;
  media: number;
  diferenca: number;
  pct: number | null;
  contagem: number; // nº de transações no mês alvo
}

const R = (n: number) => Math.round(n * 100) / 100;

export function chaveMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function diaDe(booking_date: string): number {
  return Number(booking_date.slice(8, 10));
}

function alvoInfo(mesAlvo: string, agora: Date): { ehMesAtual: boolean; diaLimite: number } {
  const ehMesAtual = mesAlvo === chaveMes(agora);
  return { ehMesAtual, diaLimite: ehMesAtual ? agora.getDate() : 31 };
}

function mesesBase(txs: TxAnalise[], mesAlvo: string, nMeses: number): string[] {
  const s = new Set<string>();
  for (const t of txs) {
    const m = t.booking_date.slice(0, 7);
    if (m < mesAlvo) s.add(m);
  }
  return [...s].sort((a, b) => (a < b ? 1 : -1)).slice(0, nMeses);
}

function valorTipo(amount: number, tipo: TipoAnalise): number {
  if (tipo === "gastos") return amount < 0 ? -amount : 0;
  return amount > 0 ? amount : 0;
}

interface Grupo {
  chave: string;
  rotulo: string;
  cor: string;
  icone: string | null;
}

/** Motor genérico: agrupa por `grupoDe` e compara mês alvo vs média base. */
function compararAgrupado(
  txs: TxAnalise[],
  mesAlvo: string,
  agora: Date,
  nMeses: number,
  tipo: TipoAnalise,
  grupoDe: (t: TxAnalise) => Grupo | null
): { itens: ItemComparado[]; nBase: number; ehMesAtual: boolean } {
  const { ehMesAtual, diaLimite } = alvoInfo(mesAlvo, agora);
  const base = new Set(mesesBase(txs, mesAlvo, nMeses));

  const meta = new Map<string, Grupo>();
  const atual = new Map<string, number>();
  const contagem = new Map<string, number>();
  const porBase = new Map<string, Map<string, number>>();

  for (const t of txs) {
    if (t.movimento) continue;
    const v = valorTipo(t.amount, tipo);
    if (v === 0) continue;
    if (diaDe(t.booking_date) > diaLimite) continue;
    const mes = t.booking_date.slice(0, 7);
    if (mes !== mesAlvo && !base.has(mes)) continue;
    const g = grupoDe(t);
    if (!g) continue;
    if (!meta.has(g.chave)) meta.set(g.chave, g);
    if (mes === mesAlvo) {
      atual.set(g.chave, (atual.get(g.chave) ?? 0) + v);
      contagem.set(g.chave, (contagem.get(g.chave) ?? 0) + 1);
    } else {
      const mm = porBase.get(g.chave) ?? new Map<string, number>();
      mm.set(mes, (mm.get(mes) ?? 0) + v);
      porBase.set(g.chave, mm);
    }
  }

  const nBase = base.size;
  const chaves = new Set<string>([...atual.keys(), ...porBase.keys()]);
  const itens: ItemComparado[] = [];
  for (const ch of chaves) {
    const a = R(atual.get(ch) ?? 0);
    const somaBase = [...(porBase.get(ch)?.values() ?? [])].reduce(
      (s, v) => s + v,
      0
    );
    const media = nBase > 0 ? R(somaBase / nBase) : 0;
    if (a === 0 && media === 0) continue;
    const dif = R(a - media);
    const pct = media > 0 ? Math.round((dif / media) * 100) : null;
    const g = meta.get(ch)!;
    itens.push({
      chave: ch,
      rotulo: g.rotulo,
      cor: g.cor,
      icone: g.icone,
      atual: a,
      media,
      diferenca: dif,
      pct,
      contagem: contagem.get(ch) ?? 0,
    });
  }
  itens.sort((x, y) => y.diferenca - x.diferenca);
  return { itens, nBase, ehMesAtual };
}

/** Comparação por categoria. */
export function compararCategorias(
  txs: TxAnalise[],
  mesAlvo: string,
  agora = new Date(),
  nMeses = 3,
  tipo: TipoAnalise = "gastos"
) {
  return compararAgrupado(txs, mesAlvo, agora, nMeses, tipo, (t) => ({
    chave: t.categoryId ?? "__none__",
    rotulo: t.categoria ?? "Por categorizar",
    cor: t.cor,
    icone: t.icone,
  }));
}

/** Comparação por comerciante (só transações com chave). */
export function compararComerciantes(
  txs: TxAnalise[],
  mesAlvo: string,
  agora = new Date(),
  nMeses = 3,
  tipo: TipoAnalise = "gastos",
  categoryId?: string
) {
  const filtradas = categoryId
    ? txs.filter((t) => t.categoryId === categoryId)
    : txs;
  return compararAgrupado(filtradas, mesAlvo, agora, nMeses, tipo, (t) =>
    t.chave
      ? { chave: t.chave, rotulo: t.nomeComerciante, cor: t.cor, icone: t.icone }
      : null
  );
}

export interface ResumoComparativo {
  ehMesAtual: boolean;
  diaLimite: number;
  diasNoMes: number;
  gastoAtual: number;
  gastoMedia: number;
  gastoDif: number;
  gastoPct: number | null;
  projecao: number | null;
  ganhoAtual: number;
  ganhoMedia: number;
  ganhoDif: number;
  ganhoPct: number | null;
  poupancaAtual: number | null;
  poupancaMedia: number | null;
}

/** Totais (gastos, ganhos, poupança) do mês alvo vs média base. */
export function resumoComparativo(
  txs: TxAnalise[],
  mesAlvo: string,
  agora = new Date(),
  nMeses = 3
): ResumoComparativo | null {
  const { ehMesAtual, diaLimite } = alvoInfo(mesAlvo, agora);
  const [anoAlvo, mesNum] = mesAlvo.split("-").map(Number);
  const diasNoMes = new Date(anoAlvo, mesNum, 0).getDate();
  const base = new Set(mesesBase(txs, mesAlvo, nMeses));
  if (base.size === 0) return null;

  let gastoAtual = 0;
  let ganhoAtual = 0;
  const gastoBase = new Map<string, number>();
  const ganhoBase = new Map<string, number>();

  for (const t of txs) {
    if (t.movimento) continue;
    if (diaDe(t.booking_date) > diaLimite) continue;
    const mes = t.booking_date.slice(0, 7);
    if (mes !== mesAlvo && !base.has(mes)) continue;
    const gasto = t.amount < 0 ? -t.amount : 0;
    const ganho = t.amount > 0 ? t.amount : 0;
    if (mes === mesAlvo) {
      gastoAtual += gasto;
      ganhoAtual += ganho;
    } else {
      if (gasto) gastoBase.set(mes, (gastoBase.get(mes) ?? 0) + gasto);
      if (ganho) ganhoBase.set(mes, (ganhoBase.get(mes) ?? 0) + ganho);
    }
  }

  const n = base.size;
  const media = (m: Map<string, number>) =>
    R([...m.values()].reduce((s, v) => s + v, 0) / n);
  const gastoMedia = media(gastoBase);
  const ganhoMedia = media(ganhoBase);
  const taxa = (ganho: number, gasto: number) =>
    ganho > 0 ? Math.round(((ganho - gasto) / ganho) * 100) : null;
  const pct = (atual: number, med: number) =>
    med > 0 ? Math.round(((atual - med) / med) * 100) : null;

  return {
    ehMesAtual,
    diaLimite,
    diasNoMes,
    gastoAtual: R(gastoAtual),
    gastoMedia,
    gastoDif: R(gastoAtual - gastoMedia),
    gastoPct: pct(gastoAtual, gastoMedia),
    projecao:
      ehMesAtual && diaLimite > 0
        ? R((gastoAtual / diaLimite) * diasNoMes)
        : null,
    ganhoAtual: R(ganhoAtual),
    ganhoMedia,
    ganhoDif: R(ganhoAtual - ganhoMedia),
    ganhoPct: pct(ganhoAtual, ganhoMedia),
    poupancaAtual: taxa(ganhoAtual, gastoAtual),
    poupancaMedia: taxa(ganhoMedia, gastoMedia),
  };
}

export interface PontoMensal {
  chave: string;
  rotulo: string;
  valor: number;
  alvo: boolean;
}

const formatoMesCurto = new Intl.DateTimeFormat("pt-PT", { month: "short" });

/** Série mensal (meses completos) do tipo, opcionalmente filtrada a uma
 *  categoria — para a mini-tendência do drill-in. Termina no mês alvo. */
export function historicoMensal(
  txs: TxAnalise[],
  mesAlvo: string,
  tipo: TipoAnalise,
  nMeses = 6,
  categoryId?: string
): PontoMensal[] {
  const [ano, mes] = mesAlvo.split("-").map(Number);
  const pontos: PontoMensal[] = [];
  for (let i = nMeses - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    const chave = chaveMes(d);
    pontos.push({
      chave,
      rotulo: formatoMesCurto.format(d),
      valor: 0,
      alvo: chave === mesAlvo,
    });
  }
  const idx = new Map(pontos.map((p) => [p.chave, p]));
  for (const t of txs) {
    if (t.movimento) continue;
    if (categoryId && t.categoryId !== categoryId) continue;
    const p = idx.get(t.booking_date.slice(0, 7));
    if (!p) continue;
    p.valor = R(p.valor + valorTipo(t.amount, tipo));
  }
  return pontos;
}

/**
 * Agrega comerciantes por todo o histórico carregado (sem comparação) — para
 * a vista "Todos os meses" do drill-in. Ordenado por total.
 */
export function agregarComerciantes(
  txs: TxAnalise[],
  tipo: TipoAnalise,
  categoryId?: string
): ItemComparado[] {
  const meta = new Map<string, Grupo>();
  const soma = new Map<string, number>();
  const cont = new Map<string, number>();

  for (const t of txs) {
    if (t.movimento || !t.chave) continue;
    if (categoryId && t.categoryId !== categoryId) continue;
    const v = valorTipo(t.amount, tipo);
    if (v === 0) continue;
    if (!meta.has(t.chave)) {
      meta.set(t.chave, {
        chave: t.chave,
        rotulo: t.nomeComerciante,
        cor: t.cor,
        icone: t.icone,
      });
    }
    soma.set(t.chave, (soma.get(t.chave) ?? 0) + v);
    cont.set(t.chave, (cont.get(t.chave) ?? 0) + 1);
  }

  return [...meta.values()]
    .map((g) => ({
      chave: g.chave,
      rotulo: g.rotulo,
      cor: g.cor,
      icone: g.icone,
      atual: R(soma.get(g.chave) ?? 0),
      media: 0,
      diferenca: 0,
      pct: null,
      contagem: cont.get(g.chave) ?? 0,
    }))
    .sort((a, b) => b.atual - a.atual);
}
