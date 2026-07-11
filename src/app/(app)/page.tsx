import Link from "next/link";
import {
  Banknote,
  HandCoins,
  PiggyBank,
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
  somaDoMesPorCategoria,
  topGastosDoMes,
  type TransacaoDash,
} from "@/lib/dashboard";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { diasAte, formatarEuros } from "@/lib/format";
import { resolverNome } from "@/lib/nomes-comerciantes";
import {
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
    overrides,
  ] = await Promise.all([
    supabase.from("accounts").select("balance"),
    supabase
      .from("transactions")
      .select(
        "id, booking_date, amount, description, counterparty, category_id, categories (name, color, icon)"
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
      .select("id, category_id, amount, period, categories (name, color, icon)"),
    carregarCoresOverride(supabase),
  ]);

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
  const salarioMes = somaDoMesPorCategoria(transacoes, "Salário");
  const tarefasMes = somaDoMesPorCategoria(transacoes, "Tarefas");
  const topGastos = topGastosDoMes(transacoes, 5);
  const comparacao = comparacaoComMesAnterior(transacoes);

  // Orçamentos mais apertados (para o cartão-resumo)
  const linhas = (transacoesRaw ?? []) as unknown as LinhaTransacao[];
  const transacoesOrcamento = linhas
    .filter((t) => Number(t.amount) < 0)
    .map((t) => ({
      booking_date: t.booking_date,
      amount: Number(t.amount),
      category_id: t.category_id,
    }));
  const estadosOrcamentos = (
    (orcamentosRaw ?? []) as unknown as OrcamentoComCategoria[]
  )
    .map((o) => estadoDoOrcamento(o, transacoesOrcamento))
    .sort((a, b) => b.percentagem - a.percentagem)
    .slice(0, 3);

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

      {/* Cartões de resumo */}
      <div className={cn("grid grid-cols-3 gap-2", ANIM)} style={atraso(1)}>
        {[
          {
            rotulo: "Salário",
            valor: formatarEuros(salarioMes),
            icon: Banknote,
            cor: "#16a34a",
          },
          {
            rotulo: "Tarefas",
            valor: formatarEuros(tarefasMes),
            icon: HandCoins,
            cor: "#f59e0b",
          },
          {
            rotulo: "Poupança",
            valor:
              resumo.taxaPoupanca === null ? "—" : `${resumo.taxaPoupanca}%`,
            icon: PiggyBank,
            cor: "#8b5cf6",
          },
        ].map(({ rotulo, valor, icon: Icon, cor }) => (
          <Card key={rotulo} className="border-none shadow-sm">
            <CardContent className="flex flex-col gap-2 pt-1">
              <span
                className="flex size-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `${cor}1f`, color: cor }}
              >
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground">{rotulo}</p>
                <p className="text-sm font-bold tabular-nums">{valor}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insight: comparação com o mês anterior */}
      {comparacao && (
        <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(2)}>
          <CardContent className="flex items-center gap-3 pt-1">
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
          </CardContent>
        </Card>
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

      <Card className={cn("border-none shadow-sm", ANIM)} style={atraso(4)}>
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
                    {resolverNome(
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
