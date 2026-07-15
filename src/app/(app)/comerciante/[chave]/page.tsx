import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { formatarData, formatarEuros } from "@/lib/format";
import { chaveDoNome, resolverNome } from "@/lib/nomes-comerciantes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

interface Linha {
  id: string;
  booking_date: string;
  amount: string;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  is_movement: boolean;
  custom_name: string | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
}

const formatoMesCurto = new Intl.DateTimeFormat("pt-PT", { month: "short" });

export default async function ComerciantePage({
  params,
}: {
  params: Promise<{ chave: string }>;
}) {
  const { chave } = await params;
  const alvo = decodeURIComponent(chave);
  const supabase = await createClient();

  const seguro = alvo.replace(/[,()"'\\%_*]/g, " ").trim();

  const [{ data: nomesRaw }, overrides, { data: candidatasRaw }] =
    await Promise.all([
      supabase.from("merchant_names").select("match_value, display_name"),
      carregarCoresOverride(supabase),
      supabase
        .from("transactions")
        .select(
          "id, booking_date, amount, description, counterparty, category_id, is_movement, custom_name, categories (name, color, icon)"
        )
        .or(`description.ilike.*${seguro}*,counterparty.ilike.*${seguro}*`)
        .order("booking_date", { ascending: false })
        .limit(500),
    ]);

  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );

  // Refinar: só as transações cuja chave real é exatamente esta
  const transacoes = ((candidatasRaw ?? []) as unknown as Linha[]).filter(
    (t) => chaveDoNome(t.description, t.counterparty) === alvo
  );

  const amostra = transacoes[0];
  const nome = amostra
    ? resolverNome(amostra.description, amostra.counterparty, nomes)
    : alvo;
  const cor = corCategoria(
    overrides,
    amostra?.category_id,
    amostra?.categories?.color
  );
  const categoria = amostra?.categories?.name ?? "Por categorizar";
  const icone = amostra?.categories?.icon;

  const gastos = transacoes.filter(
    (t) => Number(t.amount) < 0 && !t.is_movement
  );
  const totalGasto = gastos.reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const nGastos = gastos.length;
  const ticketMedio = nGastos > 0 ? totalGasto / nGastos : 0;

  // Gasto por mês (últimos 6 meses) para a mini-tendência
  const meses: { chave: string; rotulo: string; valor: number }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 6; i++) {
    meses.unshift({
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      rotulo: formatoMesCurto.format(d),
      valor: 0,
    });
    d.setMonth(d.getMonth() - 1);
  }
  const porChave = new Map(meses.map((m) => [m.chave, m]));
  for (const t of gastos) {
    const m = porChave.get(t.booking_date.slice(0, 7));
    if (m) m.valor += Math.abs(Number(t.amount));
  }
  const maxMes = Math.max(1, ...meses.map((m) => m.valor));
  const mesesComGasto = meses.filter((m) => m.valor > 0).length || 1;
  const mediaMensal =
    meses.reduce((s, m) => s + m.valor, 0) / mesesComGasto;

  // Agrupar histórico por dia
  const grupos = new Map<string, Linha[]>();
  for (const t of transacoes) {
    const g = grupos.get(t.booking_date) ?? [];
    g.push(t);
    grupos.set(t.booking_date, g);
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/transacoes" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Comerciante</h1>
      </div>

      <div className="flex items-center gap-3">
        <IconeCategoria icone={icone} cor={cor} className="size-12" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{nome}</p>
          <p className="text-xs text-muted-foreground">{categoria}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { rotulo: "Total gasto", valor: formatarEuros(totalGasto) },
          {
            rotulo: "Transações",
            valor: String(nGastos),
          },
          { rotulo: "Média/vez", valor: formatarEuros(ticketMedio) },
        ].map((s) => (
          <Card key={s.rotulo} className="border-none shadow-sm">
            <CardContent className="flex flex-col gap-1 pt-1">
              <p className="text-[11px] text-muted-foreground">{s.rotulo}</p>
              <p className="text-sm font-bold tabular-nums">{s.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalGasto > 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col gap-3 pt-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">Últimos 6 meses</p>
              <p className="text-xs text-muted-foreground">
                média {formatarEuros(mediaMensal)}/mês
              </p>
            </div>
            <div className="flex items-end justify-between gap-2 pt-1">
              {meses.map((m) => (
                <div key={m.chave} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className="w-5 rounded-full transition-all"
                      style={{
                        height: `${Math.max(3, (m.valor / maxMes) * 100)}%`,
                        backgroundColor: m.valor > 0 ? (cor ?? "#10b981") : "var(--muted)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] capitalize text-muted-foreground">
                    {m.rotulo}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <p className="px-1 text-sm font-semibold text-muted-foreground">
          Histórico
        </p>
        {[...grupos.entries()].map(([dia, linhas]) => (
          <div key={dia} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatarData(dia)}
            </p>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              {linhas.map((t, i) => {
                const valor = Number(t.amount);
                return (
                  <Link
                    key={t.id}
                    href={`/transacoes/${t.id}`}
                    className={cn(
                      "flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/50 active:bg-muted/60",
                      i > 0 && "border-t border-border/50"
                    )}
                  >
                    <p className="truncate text-sm">
                      {t.custom_name ?? t.description ?? nome}
                    </p>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        valor > 0 && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {valor > 0 ? "+" : ""}
                      {formatarEuros(t.amount)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
