import Link from "next/link";
import { ArrowLeft, Repeat, TrendingUp } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chaveDoNome } from "@/lib/nomes-comerciantes";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { formatarData, formatarEuros } from "@/lib/format";
import { resolverNome } from "@/lib/nomes-comerciantes";
import {
  ROTULO_CADENCIA,
  detetarRecorrencias,
  type TxRecorrencia,
} from "@/lib/recorrencias";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface Linha {
  booking_date: string;
  amount: string;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

export default async function RecorrenciasPage() {
  const supabase = await createClient();

  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - 13);

  const [{ data: transacoesRaw }, { data: nomesRaw }, overrides] =
    await Promise.all([
      supabase
        .from("transactions")
        .select(
          "booking_date, amount, description, counterparty, category_id, categories (name, color, icon)"
        )
        .lt("amount", 0)
        .gte("booking_date", inicio.toISOString().slice(0, 10)),
      supabase.from("merchant_names").select("match_value, display_name"),
      carregarCoresOverride(supabase),
    ]);

  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );

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

  const recorrencias = detetarRecorrencias(txs);
  const ativas = recorrencias.filter((r) => r.ativa);
  const inativas = recorrencias.filter((r) => !r.ativa);
  const totalMensal = ativas.reduce((s, r) => s + r.mensalEquivalente, 0);

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
          {ativas.length}{" "}
          {ativas.length === 1 ? "recorrência ativa" : "recorrências ativas"}
        </p>
      </div>

      {recorrencias.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <Repeat className="size-9 text-primary" />
          <p className="text-sm font-medium">Ainda sem recorrências</p>
          <p className="text-xs text-muted-foreground">
            Assim que houver cobranças regulares (subscrições, ginásio,
            contas…), a app deteta-as sozinha e mostra-as aqui.
          </p>
        </div>
      )}

      {ativas.length > 0 && (
        <div className="flex flex-col gap-2">
          {ativas.map((r) => {
            const nome = resolverNome(
              r.descricaoAmostra,
              r.contraparteAmostra,
              nomes
            );
            return (
              <Link
                key={r.chave}
                href={`/comerciante/${encodeURIComponent(r.chave)}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-colors hover:bg-muted/40 active:scale-[0.99]"
              >
                <IconeCategoria icone={r.icone} cor={r.cor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ROTULO_CADENCIA[r.cadencia]} · próxima{" "}
                    {formatarData(r.proximaData)}
                  </p>
                </div>
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
                        className={cn(
                          "size-3",
                          r.deltaPreco < 0 && "rotate-180"
                        )}
                      />
                      {r.deltaPreco > 0 ? "+" : ""}
                      {formatarEuros(r.deltaPreco)}
                    </Badge>
                  )}
                </div>
              </Link>
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
    </div>
  );
}
