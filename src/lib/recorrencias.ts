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

/** Deteta subscrições/gastos fixos: mesmo comerciante, cadência regular e
 * valor consistente, com pelo menos 3 ocorrências. */
export function detetarRecorrencias(
  transacoes: TxRecorrencia[],
  agora = new Date()
): Recorrencia[] {
  const grupos = new Map<string, TxRecorrencia[]>();
  for (const t of transacoes) {
    if (t.amount >= 0 || !t.chave) continue;
    const g = grupos.get(t.chave) ?? [];
    g.push(t);
    grupos.set(t.chave, g);
  }

  const resultado: Recorrencia[] = [];

  for (const [chave, lista] of grupos) {
    if (lista.length < 3) continue;
    const ordenadas = [...lista].sort((a, b) =>
      a.booking_date < b.booking_date ? -1 : 1
    );

    const datas = ordenadas.map((t) => new Date(t.booking_date).getTime());
    const gaps: number[] = [];
    for (let i = 1; i < datas.length; i++) {
      gaps.push((datas[i] - datas[i - 1]) / DIA_MS);
    }
    const gapMediano = mediana(gaps);
    const cadencia = classificarCadencia(gapMediano);
    if (!cadencia) continue;

    // Valor consistente (subscrição), não gastos variáveis
    const valores = ordenadas.map((t) => Math.abs(t.amount));
    const valMediano = mediana(valores);
    if (valMediano <= 0) continue;
    const desvio =
      valores.reduce((s, v) => s + Math.abs(v - valMediano), 0) /
      valores.length /
      valMediano;
    if (desvio > 0.35) continue; // demasiado variável → não é subscrição

    const ultima = ordenadas[ordenadas.length - 1];
    const ultimaMs = datas[datas.length - 1];
    const proximaMs = ultimaMs + gapMediano * DIA_MS;
    const ativa = agora.getTime() - ultimaMs < gapMediano * DIA_MS * 1.6;

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
