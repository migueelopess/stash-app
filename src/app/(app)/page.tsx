import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { GraficoBarras } from "@/components/graficos/grafico-barras";
import { GraficoDonut } from "@/components/graficos/grafico-donut";
import { GraficoLinha } from "@/components/graficos/grafico-linha";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ganhosVsGastosPorMes,
  gastosPorCategoria,
  resumoDoMes,
  serieDeSaldo,
  somaDoMesPorCategoria,
  type TransacaoDash,
} from "@/lib/dashboard";
import { formatarEuros } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const MESES_HISTORICO = 6;
const DIAS_SERIE_SALDO = 90;

interface LinhaTransacao {
  booking_date: string;
  amount: number;
  categories: { name: string; color: string | null } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const inicioHistorico = new Date();
  inicioHistorico.setMonth(inicioHistorico.getMonth() - MESES_HISTORICO);
  inicioHistorico.setDate(1);

  const [{ data: contas }, { data: transacoesRaw }] = await Promise.all([
    supabase.from("accounts").select("balance"),
    supabase
      .from("transactions")
      .select("booking_date, amount, categories (name, color)")
      .gte("booking_date", inicioHistorico.toISOString().slice(0, 10))
      .order("booking_date"),
  ]);

  if (!contas || contas.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Ainda não tens bancos ligados.{" "}
            <Link href="/contas" className="font-medium text-foreground underline">
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
    booking_date: t.booking_date,
    amount: Number(t.amount),
    categoria: t.categories?.name ?? null,
    cor: t.categories?.color ?? null,
  }));

  const saldoTotal = contas.reduce((soma, c) => soma + Number(c.balance ?? 0), 0);
  const resumo = resumoDoMes(transacoes);
  const barras = ganhosVsGastosPorMes(transacoes, MESES_HISTORICO);
  const donut = gastosPorCategoria(transacoes);
  const linha = serieDeSaldo(saldoTotal, transacoes, DIAS_SERIE_SALDO);
  const salarioMes = somaDoMesPorCategoria(transacoes, "Salário");
  const tarefasMes = somaDoMesPorCategoria(transacoes, "Tarefas");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Card>
        <CardContent className="flex flex-col gap-1 pt-2">
          <p className="text-sm text-muted-foreground">Saldo total</p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatarEuros(saldoTotal)}
          </p>
          <p
            className={cn(
              "flex items-center gap-1 text-sm",
              resumo.variacao >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {resumo.variacao >= 0 ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )}
            {resumo.variacao >= 0 ? "+" : ""}
            {formatarEuros(resumo.variacao)} este mês
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-2">
            <p className="text-xs text-muted-foreground">Salário</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatarEuros(salarioMes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-2">
            <p className="text-xs text-muted-foreground">Tarefas</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatarEuros(tarefasMes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-2">
            <p className="text-xs text-muted-foreground">Poupança</p>
            <p className="text-sm font-semibold tabular-nums">
              {resumo.taxaPoupanca === null ? "—" : `${resumo.taxaPoupanca}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ganhos vs. gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoBarras dados={barras} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gastos do mês por categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {donut.length > 0 ? (
            <GraficoDonut dados={donut} />
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sem gastos este mês. 🎉
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Evolução do saldo (90 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <GraficoLinha dados={linha} />
        </CardContent>
      </Card>
    </div>
  );
}
