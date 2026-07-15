import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { BotaoSubmit } from "@/components/botao-submit";
import { Segmentado } from "@/components/form/segmentado";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatarEuros } from "@/lib/format";
import {
  CORES_NIVEL,
  FIM_PERIODO,
  estadoDoOrcamento,
  nomeDoOrcamento,
  type OrcamentoComCategoria,
  type TransacaoParaOrcamento,
} from "@/lib/orcamentos";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { apagarOrcamento, atualizarOrcamento } from "../actions";

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preenche um valor válido.",
  guardar: "Não foi possível guardar.",
  apagar: "Não foi possível apagar.",
};

export default async function OrcamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const inicioAno = `${new Date().getFullYear()}-01-01`;
  const [{ data }, { data: transacoesRaw }] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        "id, category_id, amount, period, start_date, categories (name, color, icon)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("booking_date, amount, category_id")
      .lt("amount", 0)
      .eq("is_movement", false)
      .gte("booking_date", inicioAno),
  ]);

  if (!data) {
    notFound();
  }
  const orcamento = data as unknown as OrcamentoComCategoria;
  const transacoes: TransacaoParaOrcamento[] = (transacoesRaw ?? []).map(
    (t) => ({
      booking_date: t.booking_date,
      amount: Number(t.amount),
      category_id: t.category_id ?? null,
    })
  );
  const estado = estadoDoOrcamento(orcamento, transacoes);
  const cor = CORES_NIVEL[estado.nivel];

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/orcamentos" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">{nomeDoOrcamento(orcamento)}</h1>
      </div>

      {erro && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {MENSAGENS_ERRO[erro] ?? "Ocorreu um erro."}
        </p>
      )}

      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col gap-3 pt-2">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold tabular-nums" style={{ color: cor }}>
              {formatarEuros(estado.gasto)}
            </p>
            <p className="text-sm text-muted-foreground">
              de {formatarEuros(estado.limite)}
            </p>
          </div>
          <BarraProgresso percentagem={estado.percentagem} cor={cor} />
          <p className="text-xs text-muted-foreground">
            {estado.restante >= 0
              ? `Sobram ${formatarEuros(estado.restante)} · ${estado.diasRestantes} dias restantes`
              : `Ultrapassado em ${formatarEuros(-estado.restante)}`}
            {estado.ritmoDiario !== null &&
              ` · ~${formatarEuros(estado.ritmoDiario)}/dia`}
          </p>
          {estado.projecao !== null && estado.nivel !== "ultrapassado" && (
            <p
              className={cn(
                "text-xs",
                estado.projecao > estado.limite
                  ? "font-medium text-rose-600 dark:text-rose-400"
                  : "text-muted-foreground"
              )}
            >
              🔮 Ao ritmo atual acabas {FIM_PERIODO[orcamento.period].replace("da ", "a ").replace("do ", "o ")} em ~
              {formatarEuros(estado.projecao)}
              {estado.projecao > estado.limite &&
                ` (${formatarEuros(estado.projecao - estado.limite)} acima do limite)`}
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Editar</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={atualizarOrcamento} className="flex flex-col gap-4">
            <input type="hidden" name="orcamento_id" value={orcamento.id} />
            <div className="flex flex-col gap-2">
              <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
                Limite
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  €
                </span>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  inputMode="decimal"
                  defaultValue={Number(orcamento.amount)}
                  required
                  className="h-12 w-full rounded-2xl border border-border/60 bg-background pl-9 pr-4 text-lg font-semibold shadow-sm outline-none focus:border-ring"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                Período
              </label>
              <Segmentado
                name="period"
                valorInicial={orcamento.period}
                opcoes={[
                  { valor: "weekly", rotulo: "Semanal" },
                  { valor: "monthly", rotulo: "Mensal" },
                  { valor: "yearly", rotulo: "Anual" },
                ]}
              />
            </div>
            <BotaoSubmit
              className="h-12 w-full rounded-2xl text-base"
              pendingText="A guardar…"
            >
              Guardar
            </BotaoSubmit>
          </form>
        </CardContent>
      </Card>

      <form action={apagarOrcamento}>
        <input type="hidden" name="orcamento_id" value={orcamento.id} />
        <BotaoSubmit variant="destructive" size="sm" className="w-full">
          <Trash2 className="size-4" /> Apagar orçamento
        </BotaoSubmit>
      </form>
    </div>
  );
}
