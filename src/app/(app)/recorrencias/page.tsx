import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  EyeOff,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { FormularioRecorrencia } from "@/components/form/formulario-recorrencia";
import { IconeCategoria } from "@/components/icone-categoria";
import { ModalSheet } from "@/components/modal-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { formatarData, formatarEuros } from "@/lib/format";
import { chaveDoNome, resolverNome } from "@/lib/nomes-comerciantes";
import {
  ROTULO_CADENCIA,
  detetarRecorrencias,
  mensalEquivalenteDe,
  type Cadencia,
  type TxRecorrencia,
} from "@/lib/recorrencias";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  apagarRecorrenciaManual,
  excluirRecorrencia,
  restaurarRecorrencia,
} from "./actions";

interface ItemFixo {
  id: string;
  tipo: "auto" | "manual";
  chave?: string;
  nome: string;
  cor: string | null;
  icone: string | null;
  valor: number;
  cadencia: Cadencia;
  proximaData: string | null;
  deltaPreco: number | null;
  mensalEquivalente: number;
  confirmada: boolean;
}

interface Linha {
  booking_date: string;
  amount: string;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

export default async function RecorrenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ form?: string; erro?: string }>;
}) {
  const { form } = await searchParams;
  const supabase = await createClient();

  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 13);

  const [
    { data: transacoesRaw },
    { data: nomesRaw },
    { data: exclusoesRaw },
    { data: confirmacoesRaw },
    { data: manualRaw },
    { data: categoriasRaw },
    overrides,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "booking_date, amount, description, counterparty, category_id, categories (name, color, icon)"
      )
      .lt("amount", 0)
      .gte("booking_date", inicio.toISOString().slice(0, 10)),
    supabase.from("merchant_names").select("match_value, display_name"),
    supabase.from("recurring_exclusions").select("chave"),
    supabase.from("recurring_confirmations").select("chave"),
    supabase
      .from("recurring_manual")
      .select("id, name, amount, cadence, category_id, next_date"),
    supabase
      .from("categories")
      .select("id, name, color, icon")
      .eq("kind", "expense")
      .order("name"),
    carregarCoresOverride(supabase),
  ]);

  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );
  const excluidas = new Set((exclusoesRaw ?? []).map((e) => e.chave as string));
  const confirmadas = new Set(
    (confirmacoesRaw ?? []).map((e) => e.chave as string)
  );
  const categorias = (categoriasRaw ?? []) as {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  }[];
  const catPorId = new Map(categorias.map((c) => [c.id, c]));

  const txs: TxRecorrencia[] = ((transacoesRaw ?? []) as unknown as Linha[])
    .map((t) => {
      const chave = chaveDoNome(t.description, t.counterparty);
      return chave
        ? {
            chave,
            booking_date: t.booking_date,
            amount: Number(t.amount),
            descricao: t.description,
            contraparte: t.counterparty,
            categoria: t.categories?.name ?? null,
            cor: corCategoria(overrides, t.category_id, t.categories?.color),
            icone: t.categories?.icon ?? null,
          }
        : null;
    })
    .filter((t): t is TxRecorrencia => t !== null);

  const recorrencias = detetarRecorrencias(txs, excluidas, confirmadas);
  const inativas = recorrencias.filter((r) => !r.ativa);

  const fixosAuto: ItemFixo[] = recorrencias
    .filter((r) => r.ativa)
    .map((r) => ({
      id: r.chave,
      tipo: "auto",
      chave: r.chave,
      nome: resolverNome(r.descricaoAmostra, r.contraparteAmostra, nomes),
      cor: r.cor,
      icone: r.icone,
      valor: r.valor,
      cadencia: r.cadencia,
      proximaData: r.proximaData,
      deltaPreco: r.deltaPreco,
      mensalEquivalente: r.mensalEquivalente,
      confirmada: r.confirmada,
    }));

  const manual = (manualRaw ?? []) as {
    id: string;
    name: string;
    amount: string;
    cadence: Cadencia;
    category_id: string | null;
    next_date: string | null;
  }[];
  const fixosManual: ItemFixo[] = manual.map((m) => {
    const c = m.category_id ? catPorId.get(m.category_id) : undefined;
    return {
      id: m.id,
      tipo: "manual",
      nome: m.name,
      cor: corCategoria(overrides, m.category_id, c?.color ?? null),
      icone: c?.icon ?? "repeat",
      valor: Number(m.amount),
      cadencia: m.cadence,
      proximaData: m.next_date,
      deltaPreco: null,
      mensalEquivalente: mensalEquivalenteDe(m.cadence, Number(m.amount)),
      confirmada: false,
    };
  });

  const fixos = [...fixosAuto, ...fixosManual].sort(
    (a, b) => b.mensalEquivalente - a.mensalEquivalente
  );
  const totalMensal = fixos.reduce((s, r) => s + r.mensalEquivalente, 0);

  // Nome apresentável para as escondidas (a partir de uma transação recente)
  const amostraPorChave = new Map<string, TxRecorrencia>();
  for (const t of txs) {
    if (!amostraPorChave.has(t.chave)) amostraPorChave.set(t.chave, t);
  }
  const escondidas = [...excluidas].map((chave) => {
    const a = amostraPorChave.get(chave);
    return {
      chave,
      nome: a ? resolverNome(a.descricao, a.contraparte, nomes) : chave,
    };
  });

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Gastos fixos</h1>
      </div>

      {/* Hero: total mensal fixo */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-5 text-white shadow-lg shadow-violet-900/20">
        <div className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-white/10 blur-2xl" />
        <p className="flex items-center gap-2 text-sm font-medium text-violet-100">
          <Repeat className="size-4" /> Gastos fixos por mês
        </p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">
          {formatarEuros(totalMensal)}
        </p>
        <p className="mt-1 text-xs text-violet-100">
          {fixos.length}{" "}
          {fixos.length === 1 ? "gasto fixo" : "gastos fixos"}
        </p>
      </div>

      {fixos.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <Repeat className="size-9 text-primary" />
          <p className="text-sm font-medium">Ainda sem gastos fixos</p>
          <p className="text-xs text-muted-foreground">
            A app deteta subscrições e contas regulares sozinha — ou toca no
            + para adicionares um à mão.
          </p>
        </div>
      )}

      {fixos.length > 0 && (
        <div className="flex flex-col gap-2">
          {fixos.map((r) => {
            const conteudo = (
              <>
                <IconeCategoria icone={r.icone} cor={r.cor} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {r.nome}
                    {r.confirmada && (
                      <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROTULO_CADENCIA[r.cadencia]}
                    {r.proximaData
                      ? ` · próxima ${formatarData(r.proximaData)}`
                      : ""}
                  </p>
                </div>
              </>
            );
            return (
              <div
                key={`${r.tipo}-${r.id}`}
                className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
              >
                {r.tipo === "auto" ? (
                  <Link
                    href={`/comerciante/${encodeURIComponent(r.chave!)}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {conteudo}
                  </div>
                )}
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <p className="text-sm font-bold tabular-nums">
                    {formatarEuros(r.valor)}
                  </p>
                  {r.deltaPreco !== null && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-0.5",
                        r.deltaPreco > 0
                          ? "border-rose-500/40 text-rose-600 dark:text-rose-400"
                          : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      <TrendingUp
                        className={cn("size-3", r.deltaPreco < 0 && "rotate-180")}
                      />
                      {r.deltaPreco > 0 ? "+" : ""}
                      {formatarEuros(r.deltaPreco)}
                    </Badge>
                  )}
                </div>
                {r.tipo === "auto" ? (
                  <form action={excluirRecorrencia}>
                    <input type="hidden" name="chave" value={r.chave} />
                    <BotaoSubmit
                      variant="ghost"
                      size="icon-sm"
                      title="Não é gasto fixo"
                    >
                      <X className="text-muted-foreground" />
                    </BotaoSubmit>
                  </form>
                ) : (
                  <form action={apagarRecorrenciaManual}>
                    <input type="hidden" name="id" value={r.id} />
                    <BotaoSubmit variant="ghost" size="icon-sm" title="Apagar">
                      <Trash2 className="text-destructive" />
                    </BotaoSubmit>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {inativas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 pt-2 text-sm font-semibold text-muted-foreground">
            Já não ativas
          </p>
          {inativas.map((r) => {
            const nome = resolverNome(
              r.descricaoAmostra,
              r.contraparteAmostra,
              nomes
            );
            return (
              <Link
                key={r.chave}
                href={`/comerciante/${encodeURIComponent(r.chave)}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 opacity-70 shadow-sm transition-colors hover:bg-muted/40"
              >
                <IconeCategoria icone={r.icone} cor={r.cor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Última {formatarData(r.ultimaData)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                  {formatarEuros(r.valor)}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {escondidas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 px-1 pt-2 text-sm font-semibold text-muted-foreground">
            <EyeOff className="size-3.5" /> Escondidas dos gastos fixos
          </p>
          {escondidas.map((e) => (
            <div
              key={e.chave}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card p-2.5 pl-3 text-sm shadow-sm"
            >
              <span className="truncate text-muted-foreground">{e.nome}</span>
              <form action={restaurarRecorrencia}>
                <input type="hidden" name="chave" value={e.chave} />
                <BotaoSubmit variant="ghost" size="icon-sm" title="Repor">
                  <RotateCcw className="text-muted-foreground" />
                </BotaoSubmit>
              </form>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/recorrencias?form=novo"
        scroll={false}
        aria-label="Novo gasto fixo"
        className="fixed bottom-28 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </Link>

      <ModalSheet
        aberto={form === "novo"}
        titulo="Novo gasto fixo"
        voltarUrl="/recorrencias"
      >
        <FormularioRecorrencia categorias={categorias} />
      </ModalSheet>
    </div>
  );
}
