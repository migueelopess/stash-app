import Link from "next/link";
import { ArrowLeft, PartyPopper, Sparkles } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { OverlayPendente } from "@/components/overlay-pendente";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Button } from "@/components/ui/button";
import { extrairPalavraChave } from "@/lib/categorizacao";
import { formatarEuros } from "@/lib/format";
import { resolverNome } from "@/lib/nomes-comerciantes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { categorizarGrupo } from "./actions";

interface Pendente {
  id: string;
  booking_date: string;
  amount: string;
  description: string | null;
  counterparty: string | null;
}

interface Grupo {
  chave: string;
  titulo: string;
  transacoes: Pendente[];
  total: number;
}

export default async function PendentesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: pendentesRaw }, { data: categorias }, { data: nomesRaw }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, booking_date, amount, description, counterparty")
        .is("category_id", null)
        .order("booking_date", { ascending: false }),
      supabase.from("categories").select("id, name, kind").order("name"),
      supabase.from("merchant_names").select("match_value, display_name"),
    ]);

  const pendentes = (pendentesRaw ?? []) as Pendente[];
  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );

  // Agrupar pelo mesmo "cérebro" da aprendizagem: uma escolha → grupo todo
  const grupos = new Map<string, Grupo>();
  for (const t of pendentes) {
    const chave =
      extrairPalavraChave(t.description) ??
      t.counterparty?.trim() ??
      t.description?.trim() ??
      t.id;
    const grupo = grupos.get(chave) ?? {
      chave,
      titulo: resolverNome(t.description, t.counterparty, nomes),
      transacoes: [],
      total: 0,
    };
    grupo.transacoes.push(t);
    grupo.total += Number(t.amount);
    grupos.set(chave, grupo);
  }

  const ordenados = [...grupos.values()].sort(
    (a, b) => b.transacoes.length - a.transacoes.length
  );

  const ganhos = (categorias ?? []).filter((c) => c.kind === "income");
  const gastos = (categorias ?? []).filter((c) => c.kind === "expense");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/transacoes" />}
        >
          <ArrowLeft />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Categorizar pendentes</h1>
          <p className="text-xs text-muted-foreground">
            {pendentes.length}{" "}
            {pendentes.length === 1 ? "transação" : "transações"} em{" "}
            {ordenados.length} {ordenados.length === 1 ? "grupo" : "grupos"}
          </p>
        </div>
      </div>

      {erro && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível categorizar. Tenta novamente.
        </p>
      )}

      {ordenados.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-accent p-3 text-xs text-accent-foreground">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Escolhe a categoria e o grupo inteiro fica categorizado — e a app
            aprende para as próximas.
          </span>
        </p>
      )}

      {ordenados.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <PartyPopper className="size-10 text-primary" />
          <p className="text-sm font-medium">Tudo categorizado!</p>
          <p className="text-xs text-muted-foreground">
            Não há transações pendentes. A app está a aprender contigo.
          </p>
        </div>
      )}

      {ordenados.map((grupo, i) => {
        const amostra = grupo.transacoes[0];
        return (
          <form
            key={grupo.chave}
            action={categorizarGrupo}
            className="relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-backwards duration-400"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <OverlayPendente />
            <input
              type="hidden"
              name="ids"
              value={grupo.transacoes.map((t) => t.id).join(",")}
            />
            <input
              type="hidden"
              name="descricao_amostra"
              value={amostra.description ?? ""}
            />
            <input
              type="hidden"
              name="contraparte_amostra"
              value={amostra.counterparty ?? ""}
            />
            <div className="flex items-center gap-3">
              <IconeCategoria ganho={grupo.total > 0} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {grupo.titulo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {grupo.transacoes.length}{" "}
                  {grupo.transacoes.length === 1 ? "transação" : "transações"}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-bold tabular-nums",
                  grupo.total > 0 && "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {grupo.total > 0 ? "+" : ""}
                {formatarEuros(grupo.total)}
              </p>
            </div>
            <SelectAutoSubmit
              name="category_id"
              ariaLabel={`Categoria para ${grupo.titulo}`}
              className="h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm shadow-sm"
            >
              <option value="">Escolher categoria…</option>
              <optgroup label="Gastos">
                {gastos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Ganhos">
                {ganhos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </SelectAutoSubmit>
          </form>
        );
      })}
    </div>
  );
}
