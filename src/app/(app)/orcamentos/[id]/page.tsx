import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      .select("id, category_id, amount, period, categories (name, color, icon)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("booking_date, amount, category_id")
      .lt("amount", 0)
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
    <div className="flex flex-col gap-4">
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
          <form action={atualizarOrcamento} className="flex flex-col gap-3">
            <input type="hidden" name="orcamento_id" value={orcamento.id} />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Limite (€)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  defaultValue={Number(orcamento.amount)}
                  required
                  className="h-10 rounded-xl border-border/60 bg-card shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="period">Período</Label>
                <select
                  id="period"
                  name="period"
                  defaultValue={orcamento.period}
                  className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm shadow-sm"
                >
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>
            <Button type="submit" size="sm">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      <form action={apagarOrcamento}>
        <input type="hidden" name="orcamento_id" value={orcamento.id} />
        <Button type="submit" variant="destructive" size="sm" className="w-full">
          <Trash2 className="size-4" /> Apagar orçamento
        </Button>
      </form>
    </div>
  );
}
