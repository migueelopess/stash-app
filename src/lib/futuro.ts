// O que aí vem: projeta as próximas ocorrências dos gastos fixos e dos
// rendimentos recorrentes (puro e testável — os nomes já vêm resolvidos).

import type { Cadencia } from "./recorrencias";

/** Uma fonte recorrente já resolvida (gasto fixo detetado/manual ou rendimento). */
export interface FonteRecorrente {
  id: string;
  nome: string;
  valor: number; // sempre positivo
  cadencia: Cadencia;
  proximaData: string; // ISO "YYYY-MM-DD"
  cor: string | null;
  icone: string | null;
  entrada: boolean; // true = dinheiro que entra
}

export interface EventoFuturo {
  id: string; // único por ocorrência (fonte + data)
  fonteId: string;
  nome: string;
  valor: number; // >0 entra, <0 sai
  data: string; // ISO
  dias: number; // dias a partir de hoje (0 = hoje)
  cor: string | null;
  icone: string | null;
  entrada: boolean;
}

const DIA_MS = 1000 * 60 * 60 * 24;

function diaLocal(iso: string): Date {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, (m ?? 1) - 1, d ?? 1);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function avancar(d: Date, cadencia: Cadencia): Date {
  const n = new Date(d);
  if (cadencia === "weekly") n.setDate(n.getDate() + 7);
  else if (cadencia === "monthly") n.setMonth(n.getMonth() + 1);
  else n.setFullYear(n.getFullYear() + 1);
  return n;
}

/**
 * Ocorrências futuras dentro do horizonte, ordenadas por data. Fontes com a
 * próxima data já passada (atrasadas) avançam até à primeira data ainda por
 * vir, para nunca mostrarmos eventos no passado.
 */
export function proximosEventos(
  fontes: FonteRecorrente[],
  agora = new Date(),
  horizonteDias = 30
): EventoFuturo[] {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + horizonteDias);

  const eventos: EventoFuturo[] = [];

  for (const f of fontes) {
    if (!f.proximaData || f.valor <= 0) continue;
    let d = diaLocal(f.proximaData);

    // Recuperar de datas passadas sem entrar em ciclo infinito
    let guarda = 0;
    while (d < hoje && guarda++ < 400) d = avancar(d, f.cadencia);
    if (d < hoje) continue;

    guarda = 0;
    while (d <= limite && guarda++ < 400) {
      const data = iso(d);
      eventos.push({
        id: `${f.id}-${data}`,
        fonteId: f.id,
        nome: f.nome,
        valor: f.entrada ? f.valor : -f.valor,
        data,
        dias: Math.round((d.getTime() - hoje.getTime()) / DIA_MS),
        cor: f.cor,
        icone: f.icone,
        entrada: f.entrada,
      });
      d = avancar(d, f.cadencia);
    }
  }

  return eventos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
}

/** O próximo dinheiro a entrar (para o "faltam X dias, ~Y€"). */
export function proximoRendimento(eventos: EventoFuturo[]): EventoFuturo | null {
  return eventos.find((e) => e.entrada) ?? null;
}

const R = (n: number) => Math.round(n * 100) / 100;

export interface SafeToSpend {
  disponivel: number; // saldo menos os fixos por vir (nunca negativo)
  porDia: number;
  porSemana: number;
  dias: number; // dias no horizonte
  reserva: number; // gastos fixos reservados no horizonte
  proximoRendimento: EventoFuturo | null;
  ateFimDoMes: boolean; // horizonte = fim do mês (sem rendimento detetado)
  emRisco: boolean; // os fixos por vir já não cabem no saldo
}

/**
 * Quanto se pode gastar por dia até ao próximo rendimento (ou até ao fim do
 * mês, se não houver rendimento detetado), depois de reservar os gastos fixos
 * que caem nesse intervalo. Feito para rendimento irregular.
 */
export function safeToSpend(
  saldo: number,
  eventos: EventoFuturo[],
  agora = new Date(),
  horizonteMaxDias = 45
): SafeToSpend {
  const proxRend = eventos.find((e) => e.entrada && e.dias >= 1) ?? null;

  let dias: number;
  let ateFimDoMes = false;
  if (proxRend) {
    dias = proxRend.dias;
  } else {
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
    dias = Math.min(
      horizonteMaxDias,
      Math.max(1, Math.round((fimMes.getTime() - hoje.getTime()) / DIA_MS))
    );
    ateFimDoMes = true;
  }

  const reserva = eventos
    .filter((e) => !e.entrada && e.dias <= dias)
    .reduce((s, e) => s + Math.abs(e.valor), 0);

  const disponivel = Math.max(0, saldo - reserva);
  const porDia = R(disponivel / dias);

  return {
    disponivel: R(disponivel),
    porDia,
    porSemana: R(porDia * 7),
    dias,
    reserva: R(reserva),
    proximoRendimento: proxRend,
    ateFimDoMes,
    emRisco: saldo - reserva < 0,
  };
}

export interface PontoPrevisao {
  data: string;
  dias: number;
  saldo: number;
}

export interface PrevisaoSaldo {
  pontos: PontoPrevisao[];
  minimo: PontoPrevisao;
  final: PontoPrevisao;
  temRendimento: boolean;
}

/**
 * Projeta o saldo dia a dia a partir de hoje, aplicando os eventos futuros
 * (fixos saem, rendimentos entram). Devolve a série e o ponto mais baixo.
 */
export function previsaoSaldo(
  saldo: number,
  eventos: EventoFuturo[],
  agora = new Date(),
  horizonteDias = 30
): PrevisaoSaldo {
  const porDia = new Map<number, number>();
  for (const e of eventos) {
    if (e.dias < 0 || e.dias > horizonteDias) continue;
    porDia.set(e.dias, (porDia.get(e.dias) ?? 0) + e.valor);
  }

  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const pontos: PontoPrevisao[] = [];
  let corrente = saldo;
  let minimo: PontoPrevisao = { data: iso(hoje), dias: 0, saldo: R(saldo) };

  for (let d = 0; d <= horizonteDias; d++) {
    corrente += porDia.get(d) ?? 0;
    const dt = new Date(hoje);
    dt.setDate(dt.getDate() + d);
    const p: PontoPrevisao = { data: iso(dt), dias: d, saldo: R(corrente) };
    pontos.push(p);
    if (p.saldo < minimo.saldo) minimo = p;
  }

  return {
    pontos,
    minimo,
    final: pontos[pontos.length - 1],
    temRendimento: eventos.some((e) => e.entrada),
  };
}
