import Link from "next/link";
import { ArrowLeft, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  compararCategorias,
  resumoComparativo,
  type ComparacaoCategoria,
} from "@/lib/analise";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { formatarEuros } from "@/lib/format";
import type { TransacaoDash } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const MESES_FETCH = 6;

const formatoMesLongo = new Intl.DateTimeFormat("pt-PT", { month: "long" });

interface Linha {
  booking_date: string;
  amount: string;
  category_id: string | null;
  is_movement: boolean;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

/** Etiqueta de variação (seta + %/valor) com cor consoante o sentido. */
function Delta({
  dif,
  pct,
  bomSeSobe = false,
  unidade = "eur",
}: {
  dif: number;
  pct: number | null;
  /** true = subir é bom (ganhos); false = subir é mau (gastos) */
  bomSeSobe?: boolean;
  /** unidade quando não há % (euros ou pontos percentuais) */
  unidade?: "eur" | "pp";
}) {
  if (Math.abs(dif) < 0.01) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
        <Minus className="size-3" /> igual
      </span>
    );
  }
  const sobe = dif > 0;
  const bom = sobe === bomSeSobe;
  const texto =
    pct !== null
      ? `${sobe ? "+" : ""}${pct}%`
      : unidade === "pp"
        ? `${sobe ? "+" : "−"}${Math.abs(Math.round(dif))} pp`
        : `${sobe ? "+" : "−"}${formatarEuros(Math.abs(dif))}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        bom
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-rose-600 dark:text-rose-400"
      )}
    >
      {sobe ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {texto}
    </span>
  );
}

function LinhaCategoria({ c }: { c: ComparacaoCategoria }) {
  const trackMax = Math.max(c.atual, c.media, 1);
  const atualPct = (c.atual / trackMax) * 100;
  const mediaPct = (c.media / trackMax) * 100;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <IconeCategoria icone={c.icone} cor={c.cor} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{c.categoria}</p>
          <p className="truncate text-xs text-muted-foreground">
            habitual {formatarEuros(c.media)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <p className="text-sm font-bold tabular-nums">
            {formatarEuros(c.atual)}
          </p>
          <Delta dif={c.diferenca} pct={c.pct} />
        </div>
      </div>
      {/* barra: este mês (preenchido) vs habitual (marca) */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${atualPct}%`, backgroundColor: c.cor }}
        />
        {c.media > 0 && (
          <span
            className="absolute top-[-2px] h-3 w-0.5 rounded bg-foreground/50"
            style={{ left: `calc(${mediaPct}% - 1px)` }}
          />
        )}
      </div>
    </div>
  );
}

export default async function AnalisePage() {
  const supabase = await createClient();

  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - MESES_FETCH);
  inicio.setDate(1);

  const [{ data: transacoesRaw }, overrides] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "booking_date, amount, category_id, is_movement, categories (name, color, icon)"
      )
      .gte("booking_date", inicio.toISOString().slice(0, 10)),
    carregarCoresOverride(supabase),
  ]);

  const transacoes: TransacaoDash[] = ((transacoesRaw ?? []) as unknown as Linha[]).map(
    (t) => ({
      booking_date: t.booking_date,
      amount: Number(t.amount),
      categoria: t.categories?.name ?? null,
      cor: corCategoria(overrides, t.category_id, t.categories?.color),
      icone: t.categories?.icon ?? null,
      movimento: t.is_movement,
    })
  );

  const agora = new Date();
  const resumo = resumoComparativo(transacoes, agora);
  const { categorias, nMesesBase } = compararCategorias(transacoes, agora);

  const mesAtualNome = formatoMesLongo.format(agora);

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
        <div>
          <h1 className="text-xl font-bold">Análise</h1>
          <p className="text-xs capitalize text-muted-foreground">
            {mesAtualNome} · até dia {agora.getDate()}
          </p>
        </div>
      </div>

      {!resumo ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <TrendingUp className="size-9 text-primary" />
          <p className="text-sm font-medium">Ainda sem histórico para comparar</p>
          <p className="text-xs text-muted-foreground">
            Assim que tiveres pelo menos um mês anterior de transações, aparece
            aqui a comparação dos teus gastos.
          </p>
        </div>
      ) : (
        <>
          {/* Hero: gasto do mês vs habitual */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 p-5 text-white shadow-lg shadow-violet-900/20">
            <div className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-white/10 blur-2xl" />
            <p className="text-sm font-medium text-violet-100">
              Gasto este mês (até hoje)
            </p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight">
              {formatarEuros(resumo.gastoAtual)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium backdrop-blur">
                {resumo.gastoDif > 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {resumo.gastoPct !== null
                  ? `${resumo.gastoDif > 0 ? "+" : ""}${resumo.gastoPct}%`
                  : formatarEuros(resumo.gastoDif)}{" "}
                vs habitual
              </span>
              <span className="text-violet-100">
                habitual {formatarEuros(resumo.gastoMedia)}
              </span>
            </div>
            <p className="mt-3 text-xs text-violet-100">
              Ao ritmo atual: ~{formatarEuros(resumo.projecao)} no fim do mês
            </p>
          </div>

          {/* Ganhos e poupança */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Ganhos até hoje
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {formatarEuros(resumo.ganhoAtual)}
                </p>
                <Delta
                  dif={resumo.ganhoAtual - resumo.ganhoMedia}
                  pct={
                    resumo.ganhoMedia > 0
                      ? Math.round(
                          ((resumo.ganhoAtual - resumo.ganhoMedia) /
                            resumo.ganhoMedia) *
                            100
                        )
                      : null
                  }
                  bomSeSobe
                />
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col gap-1 pt-1">
                <p className="text-[11px] text-muted-foreground">Poupança</p>
                <p className="text-lg font-bold tabular-nums">
                  {resumo.poupancaAtual === null
                    ? "—"
                    : `${resumo.poupancaAtual}%`}
                </p>
                {resumo.poupancaAtual !== null &&
                resumo.poupancaMedia !== null ? (
                  <Delta
                    dif={resumo.poupancaAtual - resumo.poupancaMedia}
                    pct={null}
                    bomSeSobe
                    unidade="pp"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    habitual{" "}
                    {resumo.poupancaMedia === null
                      ? "—"
                      : `${resumo.poupancaMedia}%`}
                  </span>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Por categoria */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <p className="text-sm font-semibold">Por categoria</p>
              <p className="text-xs text-muted-foreground">
                vs média de {nMesesBase}{" "}
                {nMesesBase === 1 ? "mês" : "meses"}
              </p>
            </div>
            {categorias.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Ainda sem gastos este mês para comparar.
              </p>
            ) : (
              categorias.map((c) => (
                <LinhaCategoria key={c.categoria} c={c} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
