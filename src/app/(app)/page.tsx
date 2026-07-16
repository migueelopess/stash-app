import Link from "next/link";
import {
  Banknote,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { ContadorEuros } from "@/components/contador-euros";
import { DonutComToggle } from "@/components/graficos/donut-com-toggle";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import {
  GraficoSaldoIntervalos,
  type Intervalo,
} from "@/components/graficos/grafico-saldo-intervalos";
import { GraficoSparkline } from "@/components/graficos/grafico-sparkline";
import { IconeCategoria } from "@/components/icone-categoria";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  comparacaoComMesAnterior,
  ganhosPorCategoria,
  ganhosVsGastosPorMes,
  gastosPorCategoria,
  resumoDoMes,
  serieDeSaldo,
  topGastosDoMes,
  type TransacaoDash,
} from "@/lib/dashboard";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { diasAte, formatarData, formatarEuros } from "@/lib/format";
import {
  proximoRendimento,
  proximosEventos,
  type FonteRecorrente,
} from "@/lib/futuro";
import { chaveDoNome, resolverNome } from "@/lib/nomes-comerciantes";
import { detetarRecorrencias, type TxRecorrencia } from "@/lib/recorrencias";
import {
  COLUNAS_ORCAMENTO,
  CORES_NIVEL,
  estadoDoOrcamento,
  nomeDoOrcamento,
  type OrcamentoComCategoria,
} from "@/lib/orcamentos";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const MESES_HISTORICO = 6; // gráfico de barras
const MESES_FETCH = 12; // histórico buscado (para o intervalo "1 ano")

const DIAS_POR_INTERVALO: Record<Intervalo, number> = {
  "7d": 7,
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1a": 365,
};

// Entrada em cascata dos blocos do dashboard
const ANIM =
  "animate-in fade-in-0 slide-in-from-bottom-3 fill-mode-backwards duration-500";
const atraso = (i: number) => ({ animationDelay: `${i * 70}ms` });

const formatoMesLongo = new Intl.DateTimeFormat("pt-PT", { month: "long" });

interface LinhaTransacao {
  id: string;
  booking_date: string;
  amount: number;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  is_movement: boolean;
  custom_name: string | null;
  created_at: string | null;
  categories: {
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 6) return "Boa noite";
  if (hora < 13) return "Bom dia";
  if (hora < 20) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const inicioHistorico = new Date();
  inicioHistorico.setMonth(inicioHistorico.getMonth() - MESES_FETCH);
  inicioHistorico.setDate(1);

  const [
    { data: contas },
    { data: transacoesRaw },
    { data: ligacoes },
    { data: metas },
    { data: nomesRaw },
    { data: orcamentosRaw },
    { data: dividasRaw },
    { data: exclusoesRecRaw },
    { data: confirmacoesRecRaw },
    { data: manualRecRaw },
    overrides,
  ] = await Promise.all([
    supabase.from("accounts").select("balance"),
    supabase
      .from("transactions")
      .select(
        "id, booking_date, amount, description, counterparty, category_id, is_movement, custom_name, created_at, categories (name, color, icon)"
      )
      .gte("booking_date", inicioHistorico.toISOString().slice(0, 10))
      .order("booking_date"),
    supabase
      .from("bank_connections")
      .select("bank_name, valid_until, status")
      .eq("status", "active"),
    supabase
      .from("goals")
      .select("id, name, target_amount")
      .order("created_at")
      .limit(1),
    supabase.from("merchant_names").select("match_value, display_name"),
    supabase
      .from("budgets")
      .select(COLUNAS_ORCAMENTO),
    supabase.from("debts").select("direction, amount").eq("settled", false),
    supabase.from("recurring_exclusions").select("chave"),
    supabase.from("recurring_confirmations").select("chave"),
    supabase
      .from("recurring_manual")
      .select(
        "id, name, amount, cadence, next_date, category_id, categories (name, color, icon)"
      ),
    carregarCoresOverride(supabase),
  ]);

  const excluidasRec = new Set(
    (exclusoesRecRaw ?? []).map((e) => e.chave as string)
  );
  const confirmadasRec = new Set(
    (confirmacoesRecRaw ?? []).map((e) => e.chave as string)
  );

  const dividas = (dividasRaw ?? []) as {
    direction: string;
    amount: string;
  }[];
  const totalReceber = dividas
    .filter((d) => d.direction === "a_receber")
    .reduce((s, d) => s + Number(d.amount), 0);
  const totalPagar = dividas
    .filter((d) => d.direction === "a_pagar")
    .reduce((s, d) => s + Number(d.amount), 0);

  if (!contas || contas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ainda não tens bancos ligados.{" "}
            <Link
              href="/contas"
              className="font-medium text-primary underline"
            >
              Liga o primeiro
            </Link>{" "}
            para veres aqui o resumo das tuas finanças.
          </CardContent>
        </Card>
      </div>
    );
  }

  const transacoes: TransacaoDash[] = (
    (transacoesRaw ?? []) as unknown as LinhaTransacao[]
  ).map((t) => ({
    id: t.id,
    booking_date: t.booking_date,
    amount: Number(t.amount),
    categoria: t.categories?.name ?? null,
    cor: corCategoria(overrides, t.category_id, t.categories?.color),
    icone: t.categories?.icon ?? null,
    descricao: t.description,
    contraparte: t.counterparty,
    nomePersonalizado: t.custom_name,
    movimento: t.is_movement,
  }));

  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );
  const saldoTotal = contas.reduce(
    (soma, c) => soma + Number(c.balance ?? 0),
    0
  );
  const resumo = resumoDoMes(transacoes);
  const barras = ganhosVsGastosPorMes(transacoes, MESES_HISTORICO);
  const donutGastos = gastosPorCategoria(transacoes);
  const donutGanhos = ganhosPorCategoria(transacoes);
  const seriesSaldo = Object.fromEntries(
    Object.entries(DIAS_POR_INTERVALO).map(([intervalo, dias]) => [
      intervalo,
      serieDeSaldo(saldoTotal, transacoes, dias),
    ])
  ) as Record<Intervalo, { dia: string; saldo: number }[]>;
  const sparkline = seriesSaldo["1m"];
  const topGastos = topGastosDoMes(transacoes, 5);
  const comparacao = comparacaoComMesAnterior(transacoes);

  // Orçamentos mais apertados (para o cartão-resumo)
  const linhas = (transacoesRaw ?? []) as unknown as LinhaTransacao[];
  const transacoesOrcamento = linhas
    .filter((t) => Number(t.amount) < 0 && !t.is_movement)
    .map((t) => ({
      booking_date: t.booking_date,
      amount: Number(t.amount),
      category_id: t.category_id,
      created_at: t.created_at,
    }));
  const estadosOrcamentos = (
    (orcamentosRaw ?? []) as unknown as OrcamentoComCategoria[]
  )
    .map((o) => estadoDoOrcamento(o, transacoesOrcamento))
    .sort((a, b) => b.percentagem - a.percentagem)
    .slice(0, 3);

  // Gastos fixos / recorrências (para o cartão-resumo)
  const txsRecorrencia: TxRecorrencia[] = linhas
    .map((t): TxRecorrencia | null => {
      if (t.is_movement) return null;
      const chave = chaveDoNome(t.description, t.counterparty);
      if (!chave) return null;
      return {
        chave,
        booking_date: t.booking_date,
        amount: Number(t.amount),
        descricao: t.description,
        contraparte: t.counterparty,
        categoria: t.categories?.name ?? null,
        cor: corCategoria(overrides, t.category_id, t.categories?.color),
        icone: t.categories?.icon ?? null,
      };
    })
    .filter((t): t is TxRecorrencia => t !== null);
  const recorrenciasAtivas = detetarRecorrencias(
    txsRecorrencia,
    excluidasRec,
    confirmadasRec
  ).filter((r) => r.ativa);
  // Rendimentos recorrentes (salário, tarefas regulares…) — mesmo motor,
  // do lado das entradas
  const rendimentosAtivos = detetarRecorrencias(
    txsRecorrencia,
    excluidasRec,
    confirmadasRec,
    new Date(),
    "ganhos"
  ).filter((r) => r.ativa);
  const manualRec = (manualRecRaw ?? []) as unknown as {
    id: string;
    name: string;
    amount: string;
    cadence: "weekly" | "monthly" | "yearly";
    next_date: string | null;
    category_id: string | null;
    categories: { name: string; color: string | null; icon: string | null } | null;
  }[];

  // O que aí vem: gastos fixos (detetados + manuais) e rendimentos esperados
  const fontesFuturas: FonteRecorrente[] = [
    ...recorrenciasAtivas.map((r) => ({
      id: `auto-${r.chave}`,
      nome: resolverNome(r.descricaoAmostra, r.contraparteAmostra, nomes),
      valor: r.valor,
      cadencia: r.cadencia,
      proximaData: r.proximaData,
      cor: r.cor,
      icone: r.icone,
      entrada: false,
    })),
    ...manualRec
      .filter((m) => m.next_date)
      .map((m) => ({
        id: `man-${m.id}`,
        nome: m.name,
        valor: Number(m.amount),
        cadencia: m.cadence,
        proximaData: m.next_date!,
        cor: corCategoria(overrides, m.category_id, m.categories?.color),
        icone: m.categories?.icon ?? "repeat",
        entrada: false,
      })),
    ...rendimentosAtivos.map((r) => ({
      id: `in-${r.chave}`,
      nome: resolverNome(r.descricaoAmostra, r.contraparteAmostra, nomes),
      valor: r.valor,
      cadencia: r.cadencia,
      proximaData: r.proximaData,
      cor: r.cor,
      icone: r.icone,
      entrada: true,
    })),
  ];
  const eventosFuturos = proximosEventos(fontesFuturas, new Date(), 30);
  const proxRendimento = proximoRendimento(eventosFuturos);
  const proximos = eventosFuturos.slice(0, 5);

  const aRenovar = (ligacoes ?? []).filter(
    (ligacao) => diasAte(ligacao.valid_until) <= 14
  );
  const meta = metas?.[0];
  const percentagemMeta = meta
    ? (saldoTotal / Number(meta.target_amount)) * 100
    : 0;

  const mesAnteriorNome = formatoMesLongo.format(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-sm text-muted-foreground">{saudacao()} 👋</p>
          <h1 className="text-xl font-bold">As tuas finanças</h1>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary">
          ML
        </span>
      </div>

      {aRenovar.length > 0 && (
        <Link
          href="/contas"
          className="flex items-start gap-2 rounded-xl border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {aRenovar.length === 1
              ? `A autorização do ${aRenovar[0].bank_name} expira em breve.`
              : `${aRenovar.length} autorizações bancárias expiram em breve.`}{" "}
            Toca para renovar.
          </span>
        </Link>
      )}

      {/* Hero: saldo total com gradiente e sparkline */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-lg shadow-emerald-900/20",
          ANIM
        )}
        style={atraso(0)}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl" />
        <p className="text-sm font-medium text-emerald-100">Saldo total</p>
        <ContadorEuros
          valor={saldoTotal}
          className="mt-1 block text-4xl font-extrabold tabular-nums tracking-tight"
        />
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium backdrop-blur">
          {resumo.variacao >= 0 ? (
            <TrendingUp className="size-3.5" />
          ) : (
            <TrendingDown className="size-3.5" />
          )}
          {resumo.variacao >= 0 ? "+" : ""}
          {formatarEuros(resumo.variacao)} este mês
        </p>
        <div className="-mx-2 mt-3">
          <GraficoSparkline dados={sparkline} />
        </div>
      </div>

      {/* Próximo rendimento a entrar (detetado pelo padrão) */}
      {proxRendimento && (
        <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(1)}>
          <CardContent className="flex items-center gap-3 pt-1">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Banknote className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {proxRendimento.dias === 0
                  ? "Entra hoje"
                  : proxRendimento.dias === 1
                    ? "Entra amanhã"
                    : `Faltam ${proxRendimento.dias} dias`}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {proxRendimento.nome} · {formatarData(proxRendimento.data)}
              </p>
            </div>
            <p className="shrink-0 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              ~{formatarEuros(proxRendimento.valor)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* O que aí vem nos próximos 30 dias */}
      {proximos.length > 0 && (
        <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(1)}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              Próximos
              <Link
                href="/recorrencias"
                className="text-xs font-medium text-primary"
              >
                Gastos fixos →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {proximos.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <IconeCategoria
                  icone={e.icone}
                  cor={e.cor}
                  ganho={e.entrada}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.dias === 0
                      ? "hoje"
                      : e.dias === 1
                        ? "amanhã"
                        : `em ${e.dias} dias`}{" "}
                    · {formatarData(e.data)}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    e.entrada && "text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {e.entrada ? "+" : ""}
                  {formatarEuros(e.valor)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insight: comparação com o mês anterior → leva à Análise */}
      {comparacao && (
        <Link
          href="/analise"
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:bg-muted/40 active:scale-[0.99]",
            ANIM
          )}
          style={atraso(2)}
        >
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              comparacao.diferenca <= 0
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            )}
          >
            {comparacao.diferenca <= 0 ? (
              <TrendingDown className="size-5" />
            ) : (
              <TrendingUp className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              {comparacao.diferenca <= 0 ? (
                <>
                  Gastaste{" "}
                  <strong>{formatarEuros(-comparacao.diferenca)} a menos</strong>{" "}
                  do que em {mesAnteriorNome}, à mesma altura do mês. 👏
                </>
              ) : (
                <>
                  Gastaste{" "}
                  <strong>{formatarEuros(comparacao.diferenca)} a mais</strong>{" "}
                  do que em {mesAnteriorNome}, à mesma altura do mês.
                </>
              )}
            </p>
            <p className="mt-0.5 text-xs font-medium text-primary">
              Ver análise por categoria
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      {meta && (
        <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(3)}>
          <CardContent className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <p className="font-semibold">🎯 {meta.name}</p>
              <p className="text-muted-foreground">
                {Math.min(100, Math.round(percentagemMeta))}%
              </p>
            </div>
            <BarraProgresso percentagem={percentagemMeta} />
            <p className="text-xs text-muted-foreground">
              {formatarEuros(saldoTotal)} de{" "}
              {formatarEuros(Number(meta.target_amount))}
            </p>
          </CardContent>
        </Card>
      )}

      {estadosOrcamentos.length > 0 && (
        <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(4)}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              Orçamentos
              <Link
                href="/orcamentos"
                className="text-xs font-medium text-primary"
              >
                Ver todos →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {estadosOrcamentos.map((estado) => {
              const cor = CORES_NIVEL[estado.nivel];
              return (
                <Link
                  key={estado.orcamento.id}
                  href={`/orcamentos/${estado.orcamento.id}`}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-baseline justify-between text-sm">
                    <p className="truncate font-medium">
                      {nomeDoOrcamento(estado.orcamento)}
                    </p>
                    <p
                      className="shrink-0 text-xs font-semibold tabular-nums"
                      style={{ color: cor }}
                    >
                      {estado.restante >= 0
                        ? `${formatarEuros(estado.restante)} livres`
                        : `${formatarEuros(-estado.restante)} acima`}
                    </p>
                  </div>
                  <BarraProgresso
                    percentagem={estado.percentagem}
                    cor={cor}
                    className="h-1.5"
                  />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(totalReceber > 0 || totalPagar > 0) && (
        <Link
          href="/dividas"
          className={cn(
            "flex items-stretch gap-2 rounded-2xl", ANIM
          )}
          style={atraso(4)}
        >
          <span className="flex flex-1 flex-col rounded-2xl bg-emerald-500/12 p-3">
            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
              Devem-me
            </span>
            <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatarEuros(totalReceber)}
            </span>
          </span>
          <span className="flex flex-1 flex-col rounded-2xl bg-rose-500/12 p-3">
            <span className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
              Devo
            </span>
            <span className="text-base font-bold tabular-nums text-rose-700 dark:text-rose-300">
              {formatarEuros(totalPagar)}
            </span>
          </span>
        </Link>
      )}

      <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(5)}>
        <CardHeader>
          <CardTitle className="text-sm">Ganhos vs. gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoBarras dados={barras} />
        </CardContent>
      </Card>

      <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(5)}>
        <CardHeader>
          <CardTitle className="text-sm">Este mês por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutComToggle gastos={donutGastos} ganhos={donutGanhos} />
        </CardContent>
      </Card>

      {topGastos.length > 0 && (
        <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(6)}>
          <CardHeader>
            <CardTitle className="text-sm">Maiores gastos do mês</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {topGastos.map((t) => (
              <Link
                key={t.id}
                href={`/transacoes/${t.id}`}
                className="flex items-center gap-3"
              >
                <IconeCategoria icone={t.icone} cor={t.cor} ganho={false} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {t.nomePersonalizado ??
                      resolverNome(
                        t.descricao ?? null,
                        t.contraparte ?? null,
                        nomes
                      )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.categoria ?? "Por categorizar"}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatarEuros(t.amount)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(7)}>
        <CardHeader>
          <CardTitle className="text-sm">Evolução do saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoSaldoIntervalos series={seriesSaldo} />
        </CardContent>
      </Card>
    </div>
  );
}
