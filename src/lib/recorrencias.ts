// Deteção de gastos recorrentes / subscrições a partir do padrão das
// transações (sem dependências de servidor — puro e testável).

export type Cadencia = "weekly" | "monthly" | "yearly";

export interface TxRecorrencia {
  chave: string; // chaveDoNome (comerciante)
  booking_date: string;
  amount: number; // negativo = gasto
  descricao: string | null;
  contraparte: string | null;
  categoria: string | null;
  cor: string | null;
  icone: string | null;
}

export interface Recorrencia {
  chave: string;
  descricaoAmostra: string | null;
  contraparteAmostra: string | null;
  categoria: string | null;
  cor: string | null;
  icone: string | null;
  valor: number; // positivo (mediana)
  cadencia: Cadencia;
  ultimaData: string;
  proximaData: string;
  ocorrencias: number;
  ativa: boolean;
  confirmada: boolean; // marcada à mão pelo utilizador
  deltaPreco: number | null; // variação face à cobrança anterior
  mensalEquivalente: number;
}

const DIA_MS = 1000 * 60 * 60 * 24;

function mediana(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function classificarCadencia(gapMediano: number): Cadencia | null {
  if (gapMediano >= 5 && gapMediano <= 10) return "weekly";
  if (gapMediano >= 24 && gapMediano <= 45) return "monthly";
  if (gapMediano >= 330 && gapMediano <= 400) return "yearly";
  return null;
}

const FATOR_MENSAL: Record<Cadencia, number> = {
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

/** Valor mensal equivalente de um gasto fixo (para o total). */
export function mensalEquivalenteDe(cadencia: Cadencia, valor: number): number {
  return Math.round(valor * FATOR_MENSAL[cadencia] * 100) / 100;
}

// Transferências (MB Way, etc.) nunca são gastos fixos — variam por mil razões
const CATEGORIAS_NUNCA_FIXAS = new Set([
  "Transferências",
  "Transferências recebidas",
]);

function coefVariacao(nums: number[]): number {
  const media = nums.reduce((s, n) => s + n, 0) / nums.length;
  if (media === 0) return Infinity;
  const variancia =
    nums.reduce((s, n) => s + (n - media) ** 2, 0) / nums.length;
  return Math.sqrt(variancia) / media;
}

/**
 * Deteta subscrições/gastos fixos. O sinal forte de uma subscrição é
 * valor quase idêntico + intervalos regulares (Netflix, Spotify, ginásio).
 * Restaurantes, MB Way, apostas variam de valor/timing e são descartados.
 * Categoria "Subscrições" tem regras mais tolerantes (para nunca falhar
 * uma sub real); comerciantes em `chavesExcluidas` nunca aparecem.
 */
export function detetarRecorrencias(
  transacoes: TxRecorrencia[],
  chavesExcluidas: Set<string> = new Set(),
  chavesConfirmadas: Set<string> = new Set(),
  agora = new Date()
): Recorrencia[] {
  const grupos = new Map<string, TxRecorrencia[]>();
  for (const t of transacoes) {
    if (t.amount >= 0 || !t.chave) continue;
    if (chavesExcluidas.has(t.chave)) continue;
    const g = grupos.get(t.chave) ?? [];
    g.push(t);
    grupos.set(t.chave, g);
  }

  const resultado: Recorrencia[] = [];

  for (const [chave, lista] of grupos) {
    // Confirmada à mão pelo utilizador: entra sempre, saltando os filtros —
    // a app apenas deriva valor/cadência do histórico real.
    const confirmada = chavesConfirmadas.has(chave);

    const categoria = lista[lista.length - 1].categoria;
    if (!confirmada && categoria && CATEGORIAS_NUNCA_FIXAS.has(categoria))
      continue;

    const ordenadas = [...lista].sort((a, b) =>
      a.booking_date < b.booking_date ? -1 : 1
    );

    // Valor quase idêntico — o filtro-chave contra idas ao BK/McDonald's.
    // Amostra estável (≤6% de variação) = comporta-se como subscrição.
    const valores = ordenadas.map((t) => Math.abs(t.amount));
    const valMediano = mediana(valores);
    if (valMediano <= 0) continue;
    const cvValores = coefVariacao(valores);

    const eSubscricao = categoria === "Subscrições" || cvValores <= 0.06;
    const minOcorr = eSubscricao ? 2 : 3;
    if (!confirmada && lista.length < minOcorr) continue;

    const datas = ordenadas.map((t) => new Date(t.booking_date).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < datas.length; i++) {
      gaps.push((datas[i] - datas[i - 1]) / DIA_MS);
    }
    // Sem histórico suficiente para inferir cadência: assume mensal
    // (só acontece em confirmadas com uma única cobrança).
    const gapMediano = gaps.length ? mediana(gaps) : 30;
    let cadencia = classificarCadencia(gapMediano);

    if (!confirmada) {
      if (!cadencia) continue;

      // Intervalos regulares (subscrição cai ~no mesmo dia; restaurante não)
      if (gaps.length >= 2) {
        const limiteGap = eSubscricao ? 0.6 : 0.4;
        if (coefVariacao(gaps) > limiteGap) continue;
      }

      const limiteValor = eSubscricao ? 0.4 : 0.15;
      if (cvValores > limiteValor) continue;
    } else {
      cadencia = cadencia ?? "monthly";
    }

    const ultima = ordenadas[ordenadas.length - 1];
    const ultimaMs = datas[datas.length - 1];
    const passo = classificarCadencia(gapMediano) ? gapMediano : 30;
    const proximaMs = ultimaMs + passo * DIA_MS;
    // Confirmada pelo utilizador está sempre ativa
    const ativa =
      confirmada || agora.getTime() - ultimaMs < gapMediano * DIA_MS * 1.6;

    const penultimo = valores[valores.length - 2];
    const ultimoVal = valores[valores.length - 1];
    const delta = ultimoVal - penultimo;
    const deltaPreco =
      Math.abs(delta) > 0.5 && Math.abs(delta) / valMediano > 0.05
        ? Math.round(delta * 100) / 100
        : null;

    resultado.push({
      chave,
      descricaoAmostra: ultima.descricao,
      contraparteAmostra: ultima.contraparte,
      categoria: ultima.categoria,
      cor: ultima.cor,
      icone: ultima.icone,
      valor: Math.round(valMediano * 100) / 100,
      cadencia,
      ultimaData: ultima.booking_date,
      proximaData: new Date(proximaMs).toISOString().slice(0, 10),
      ocorrencias: ordenadas.length,
      ativa,
      confirmada,
      deltaPreco,
      mensalEquivalente:
        Math.round(valMediano * FATOR_MENSAL[cadencia] * 100) / 100,
    });
  }

  // Ativas primeiro, depois por valor mensal
  return resultado.sort((a, b) => {
    if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
    return b.mensalEquivalente - a.mensalEquivalente;
  });
}

export const ROTULO_CADENCIA: Record<Cadencia, string> = {
  weekly: "Toda a semana",
  monthly: "Todo o mês",
  yearly: "Todo o ano",
};
