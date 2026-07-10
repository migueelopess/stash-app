import Link from "next/link";
import { CalendarRange, Gauge } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { IconeCategoria } from "@/components/icone-categoria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatarEuros } from "@/lib/format";
import {
  CORES_NIVEL,
  estadoDoOrcamento,
  nomeDoOrcamento,
  type OrcamentoComCategoria,
  type TransacaoParaOrcamento,
} from "@/lib/orcamentos";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { criarOrcamento } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preenche um valor válido.",
  criar: "Não foi possível criar o orçamento.",
  duplicado: "Já existe um orçamento para essa categoria.",
};

const formatoMes = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
});

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();

  const inicioAno = `${new Date().getFullYear()}-01-01`;
  const [{ data: orcamentosRaw }, { data: transacoesRaw }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(
          "id, category_id, amount, period, categories (name, color, icon)"
        ),
      supabase
        .from("transactions")
        .select("booking_date, amount, category_id")
        .lt("amount", 0)
        .gte("booking_date", inicioAno),
      supabase
        .from("categories")
        .select("id, name")
        .eq("kind", "expense")
        .order("name"),
    ]);

  const orcamentos = (orcamentosRaw ?? []) as unknown as OrcamentoComCategoria[];
  const transacoes: TransacaoParaOrcamento[] = (transacoesRaw ?? []).map(
    (t) => ({
      booking_date: t.booking_date,
      amount: Number(t.amount),
      category_id: t.category_id ?? null,
    })
  );

  const estados = orcamentos
    .map((o) => estadoDoOrcamento(o, transacoes))
    .sort((a, b) => {
      // global primeiro, depois os mais apertados
      if (a.orcamento.category_id === null) return -1;
      if (b.orcamento.category_id === null) return 1;
      return b.percentagem - a.percentagem;
    });

  const temGlobal = orcamentos.some((o) => o.category_id === null);
  const comOrcamento = new Set(
    orcamentos.map((o) => o.category_id).filter(Boolean)
  );
  const categoriasLivres = (categorias ?? []).filter(
    (c) => !comOrcamento.has(c.id)
  );

  const agora = new Date();
  const diasRestantes = estados[0]?.diasRestantes;

  return (
    <div className="flex flex-col gap-4">
      <div className="pt-1">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
          {formatoMes.format(agora)}
          {diasRestantes !== undefined &&
            ` · ${diasRestantes} ${diasRestantes === 1 ? "dia restante" : "dias restantes"}`}
        </p>
      </div>

      {erro && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {MENSAGENS_ERRO[erro] ?? "Ocorreu um erro."}
        </p>
      )}

      {estados.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
          <Gauge className="size-10 text-primary" />
          <p className="text-sm font-medium">Ainda sem orçamentos</p>
          <p className="text-xs text-muted-foreground">
            Define limites de gastos por categoria (ou um limite global) e a
            app avisa-te quando estiveres perto — ou passares — do limite.
          </p>
        </div>
      )}

      {estados.map((estado, i) => {
        const global = estado.orcamento.category_id === null;
        const cor = CORES_NIVEL[estado.nivel];
        return (
          <Link
            key={estado.orcamento.id}
            href={`/orcamentos/${estado.orcamento.id}`}
            className={cn(
              "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:bg-muted/40 active:scale-[0.99]",
              "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-400"
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              {global ? (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Gauge className="size-5" />
                </span>
              ) : (
                <IconeCategoria
                  icone={estado.orcamento.categories?.icon}
                  cor={estado.orcamento.categories?.color}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="truncate">{nomeDoOrcamento(estado.orcamento)}</span>
                  {estado.orcamento.period === "yearly" && (
                    <Badge variant="secondary" className="shrink-0">
                      <CalendarRange className="size-3" /> Anual
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatarEuros(estado.gasto)} de {formatarEuros(estado.limite)}
                </p>
              </div>
              <p
                className="shrink-0 text-sm font-bold tabular-nums"
                style={{ color: cor }}
              >
                {estado.restante >= 0
                  ? `${formatarEuros(estado.restante)} livres`
                  : `${formatarEuros(-estado.restante)} acima`}
              </p>
            </div>
            <BarraProgresso percentagem={estado.percentagem} cor={cor} />
            {estado.ritmoDiario !== null && (
              <p className="text-xs text-muted-foreground">
                Podes gastar ~{formatarEuros(estado.ritmoDiario)}/dia até ao fim
                {estado.orcamento.period === "monthly" ? " do mês" : " do ano"}.
              </p>
            )}
            {estado.nivel === "ultrapassado" && (
              <p className="text-xs font-medium" style={{ color: cor }}>
                Limite ultrapassado em {Math.round(estado.percentagem - 100)}%.
              </p>
            )}
          </Link>
        );
      })}

      {(categoriasLivres.length > 0 || !temGlobal) && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Novo orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={criarOrcamento} className="flex flex-col gap-2">
              <select
                name="category_id"
                required
                defaultValue=""
                className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm shadow-sm"
              >
                <option value="" disabled>
                  Escolher categoria…
                </option>
                {!temGlobal && (
                  <option value="global">🌍 Todos os gastos (global)</option>
                )}
                {categoriasLivres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Limite (€)"
                  required
                  className="h-10 rounded-xl border-border/60 bg-card shadow-sm"
                />
                <select
                  name="period"
                  defaultValue="monthly"
                  className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm shadow-sm"
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <Button type="submit" size="sm">
                Criar orçamento
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
