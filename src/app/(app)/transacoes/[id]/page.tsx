import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extrairPalavraChave } from "@/lib/categorizacao";
import { formatarData, formatarEuros } from "@/lib/format";
import { resolverNome } from "@/lib/nomes-comerciantes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { categorizarTransacao } from "./actions";

interface Detalhe {
  id: string;
  booking_date: string;
  amount: string;
  currency: string;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  categorized_by: string;
  accounts: { name: string | null; iban: string | null } | null;
}

export default async function TransacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("transactions")
    .select(
      "id, booking_date, amount, currency, description, counterparty, category_id, categorized_by, accounts (name, iban)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const transacao = data as unknown as Detalhe;

  const valor = Number(transacao.amount);
  const [{ data: categorias }, { data: nomesRaw }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, kind")
      .eq("kind", valor > 0 ? "income" : "expense")
      .order("name"),
    supabase.from("merchant_names").select("match_value, display_name"),
  ]);

  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );
  // Predefinido = sem personalizações (base de comparação para saber
  // se o utilizador escreveu um nome próprio)
  const nomePredefinido = resolverNome(
    transacao.description,
    transacao.counterparty,
    new Map()
  );
  const nomeAtual = resolverNome(
    transacao.description,
    transacao.counterparty,
    nomes
  );

  const palavraChave =
    extrairPalavraChave(transacao.description) ??
    transacao.counterparty ??
    null;

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
        <h1 className="text-xl font-semibold">Detalhe</h1>
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {erro === "regra"
            ? "A categoria foi guardada mas a regra falhou."
            : "Não foi possível guardar. Tenta novamente."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="truncate">{nomeAtual}</span>
            <span
              className={cn(
                "tabular-nums",
                valor > 0 && "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {valor > 0 ? "+" : ""}
              {formatarEuros(transacao.amount)}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">
            {formatarData(transacao.booking_date)}
            {transacao.accounts?.name ? ` · ${transacao.accounts.name}` : ""}
          </p>
          {transacao.description && <p>{transacao.description}</p>}
        </CardContent>
      </Card>

      <form action={categorizarTransacao} className="flex flex-col gap-4">
        <input type="hidden" name="transacao_id" value={transacao.id} />
        <input type="hidden" name="nome_predefinido" value={nomePredefinido} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome</Label>
          <Input
            id="nome"
            name="nome"
            defaultValue={nomeAtual}
            placeholder={nomePredefinido}
            className="h-10 rounded-xl border-border/60 bg-card shadow-sm"
          />
          <p className="text-xs text-muted-foreground">
            Dá um nome tipo “Intermarché” — todas as transações deste sítio
            passam a mostrá-lo.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category_id">Categoria</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={transacao.category_id ?? ""}
            className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm shadow-sm"
          >
            <option value="">Por categorizar</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {palavraChave && (
          <p className="flex items-start gap-2 rounded-xl bg-accent p-3 text-xs text-accent-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            <span>
              A app aprende contigo: futuras transações com{" "}
              <strong>“{palavraChave}”</strong> ficam automaticamente na
              categoria que escolheres.
            </span>
          </p>
        )}

        <BotaoSubmit pendingText="A guardar…">Guardar</BotaoSubmit>
      </form>
    </div>
  );
}
