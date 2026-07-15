import Link from "next/link";
import { CalendarRange, Gauge, Lightbulb, Plus, TrendingUp } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { BotaoSubmit } from "@/components/botao-submit";
import { FormularioOrcamento } from "@/components/form/formulario-orcamento";
import { IconeCategoria } from "@/components/icone-categoria";
import { ModalSheet } from "@/components/modal-sheet";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { Badge } from "@/components/ui/badge";
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
  ROTULOS_PERIODO,
  estadoDoOrcamento,
  mediaMensalPorCategoria,
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

interface CategoriaLivre {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; form?: string }>;
}) {
  const { erro, form } = await searchParams;
  const supabase = await createClient();

  const inicioAno = `${new Date().getFullYear() - 1}-10-01`; // cobre médias de 3 meses em janeiro
  const [
    { data: orcamentosRaw },
    { data: transacoesRaw },
    { data: categoriasRaw },
    overrides,
  ] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        "id, category_id, amount, period, categories (name, color, icon)"
      ),
    supabase
      .from("transactions")
      .select("booking_date, amount, category_id")
      .lt("amount", 0)
      .eq("is_movement", false)
      .gte("booking_date", inicioAno),
    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("kind", "expense")
      .order("name"),
    carregarCoresOverride(supabase),
  ]);

  // Aplicar cores personalizadas
  const categorias = ((categoriasRaw ?? []) as CategoriaLivre[]).map((c) => ({
    ...c,
    color: corCategoria(overrides, c.id, c.color),
  }));
  const orcamentos = (
    (orcamentosRaw ?? []) as unknown as OrcamentoComCategoria[]
  ).map((o) => ({
    ...o,
    categories: o.categories
      ? { ...o.categories, color: corCategoria(overrides, o.category_id, o.categories.color) }
      : null,
  }));
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
      if (a.orcamento.category_id === null) return -1;
      if (b.orcamento.category_id === null) return 1;
      return b.percentagem - a.percentagem;
    });

  const temGlobal = orcamentos.some((o) => o.category_id === null);
  const comOrcamento = new Set(
    orcamentos.map((o) => o.category_id).filter(Boolean)
  );
  const categoriasLivres = categorias.filter(
    (c) => !comOrcamento.has(c.id)
  );

  // Sugestões: média dos últimos 3 meses das categorias sem orçamento
  const medias = mediaMensalPorCategoria(transacoes);
  const sugestoes = categoriasLivres
    .map((c) => ({ categoria: c, media: medias.get(c.id) ?? 0 }))
    .filter((s) => s.media >= 5)
    .sort((a, b) => b.media - a.media)
    .slice(0, 4)
    .map((s) => ({
      ...s,
      sugerido: Math.max(5, Math.ceil(s.media / 5) * 5),
    }));

  // Resumo do mês: orçamentos mensais agregados
  const mensais = estados.filter((e) => e.orcamento.period === "monthly");
  const totalLimite = mensais.reduce((soma, e) => soma + e.limite, 0);
  const totalGasto = mensais.reduce((soma, e) => soma + e.gasto, 0);
  const pctTotal = totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0;
  const corTotal =
    pctTotal > 100 ? CORES_NIVEL.ultrapassado : pctTotal >= 75 ? CORES_NIVEL.aviso : CORES_NIVEL.ok;

  const agora = new Date();
  const diasRestantes = mensais[0]?.diasRestantes ?? estados[0]?.diasRestantes;

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

      {/* Resumo do mês (orçamentos mensais agregados) */}
      {mensais.length > 1 && (
        <div className="flex flex-col gap-2 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-lg shadow-emerald-900/20">
          <p className="text-sm font-medium text-emerald-100">
            Total dos orçamentos mensais
          </p>
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">
            {formatarEuros(totalGasto)}
            <span className="ml-2 text-base font-medium text-emerald-100">
              de {formatarEuros(totalLimite)}
            </span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.min(100, pctTotal)}%` }}
            />
          </div>
          <p className="text-xs text-emerald-100">
            {pctTotal <= 100
              ? `${Math.round(pctTotal)}% usados — sobram ${formatarEuros(totalLimite - totalGasto)}`
              : `Limites ultrapassados em ${formatarEuros(totalGasto - totalLimite)}`}
          </p>
        </div>
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
        const projecaoAcima =
          estado.projecao !== null && estado.projecao > estado.limite;
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
                  {estado.orcamento.period !== "monthly" && (
                    <Badge variant="secondary" className="shrink-0">
                      <CalendarRange className="size-3" />{" "}
                      {ROTULOS_PERIODO[estado.orcamento.period]}
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {estado.ritmoDiario !== null && (
                <span>
                  ~{formatarEuros(estado.ritmoDiario)}/dia até ao fim{" "}
                  {FIM_PERIODO[estado.orcamento.period]}
                </span>
              )}
              {estado.projecao !== null && estado.nivel !== "ultrapassado" && (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    projecaoAcima &&
                      "font-medium text-rose-600 dark:text-rose-400"
                  )}
                >
                  <TrendingUp className="size-3" />
                  Ritmo atual: ~{formatarEuros(estado.projecao)} no fim
                </span>
              )}
              {estado.nivel === "ultrapassado" && (
                <span className="font-medium" style={{ color: cor }}>
                  Limite ultrapassado em {Math.round(estado.percentagem - 100)}%
                </span>
              )}
            </div>
          </Link>
        );
      })}

      {/* Sugestões com base na média dos últimos 3 meses */}
      {sugestoes.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Lightbulb className="size-4 text-amber-500" /> Sugestões
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sugestoes.map(({ categoria, media, sugerido }) => (
              <form
                key={categoria.id}
                action={criarOrcamento}
                className="flex items-center gap-3"
              >
                <input type="hidden" name="category_id" value={categoria.id} />
                <input type="hidden" name="amount" value={sugerido} />
                <input type="hidden" name="period" value="monthly" />
                <IconeCategoria icone={categoria.icon} cor={categoria.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{categoria.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Média: {formatarEuros(media)}/mês
                  </p>
                </div>
                <BotaoSubmit variant="outline" size="sm">
                  Criar {formatarEuros(sugerido)}
                </BotaoSubmit>
              </form>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Botão flutuante + para novo orçamento */}
      {(categoriasLivres.length > 0 || !temGlobal) && (
        <Link
          href="/orcamentos?form=orcamento"
          scroll={false}
          aria-label="Novo orçamento"
          className="fixed bottom-28 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </Link>
      )}

      <ModalSheet
        aberto={form === "orcamento"}
        titulo="Novo orçamento"
        voltarUrl="/orcamentos"
      >
        <FormularioOrcamento
          categorias={categoriasLivres}
          temGlobal={temGlobal}
        />
      </ModalSheet>
    </div>
  );
}
