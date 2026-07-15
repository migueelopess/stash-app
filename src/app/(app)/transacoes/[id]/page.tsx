import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronRight,
  HandCoins,
  Repeat,
  Store,
} from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { OpcaoAprendizagem } from "@/components/opcao-aprendizagem";
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
import { chaveDoNome, resolverNome } from "@/lib/nomes-comerciantes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { confirmarRecorrencia } from "../../recorrencias/actions";
import { alternarMovimento, categorizarTransacao } from "./actions";

interface Detalhe {
  id: string;
  booking_date: string;
  amount: string;
  currency: string;
  description: string | null;
  counterparty: string | null;
  category_id: string | null;
  categorized_by: string;
  is_movement: boolean;
  custom_name: string | null;
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
      "id, booking_date, amount, currency, description, counterparty, category_id, categorized_by, is_movement, custom_name, accounts (name, iban)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }
  const transacao = data as unknown as Detalhe;

  const valor = Number(transacao.amount);
  const chaveFixo = chaveDoNome(transacao.description, transacao.counterparty);
  const [{ data: categorias }, { data: nomesRaw }, { data: confirmacao }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, kind")
        .eq("kind", valor > 0 ? "income" : "expense")
        .order("name"),
      supabase.from("merchant_names").select("match_value, display_name"),
      chaveFixo
        ? supabase
            .from("recurring_confirmations")
            .select("chave")
            .eq("chave", chaveFixo)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  const jaFixo = Boolean(confirmacao);

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
  // Nome global do comerciante (aprendido/dicionário) e o efetivamente
  // mostrado nesta linha (exceção pontual tem prioridade)
  const nomeGlobal = resolverNome(
    transacao.description,
    transacao.counterparty,
    nomes
  );
  const nomeAtual = transacao.custom_name ?? nomeGlobal;

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
                transacao.is_movement
                  ? "text-muted-foreground"
                  : valor > 0 && "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {!transacao.is_movement && valor > 0 ? "+" : ""}
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
          {transacao.is_movement && (
            <p className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <ArrowLeftRight className="size-3.5" />
              Movimento · não conta como gasto nem ganho
            </p>
          )}
        </CardContent>
      </Card>

      {palavraChave && (
        <Link
          href={`/comerciante/${encodeURIComponent(palavraChave)}`}
          className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted/50 active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 font-medium">
            <Store className="size-4 text-muted-foreground" />
            Ver histórico de {nomeGlobal}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      <Link
        href={`/dividas?form=nova&valor=${Math.abs(valor).toFixed(2)}${
          transacao.counterparty
            ? `&nome=${encodeURIComponent(transacao.counterparty)}`
            : ""
        }&dir=${valor < 0 ? "a_receber" : "a_pagar"}&tx=${transacao.id}`}
        className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted/50 active:scale-[0.99]"
      >
        <span className="flex items-center gap-2 font-medium">
          <HandCoins className="size-4 text-muted-foreground" />
          Registar como dívida
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      {valor < 0 && chaveFixo && !transacao.is_movement && (
        <form action={confirmarRecorrencia}>
          <input type="hidden" name="chave" value={chaveFixo} />
          <input type="hidden" name="voltar" value={`/transacoes/${transacao.id}`} />
          {jaFixo ? (
            <Link
              href="/recorrencias"
              className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm shadow-sm transition-colors hover:bg-primary/10 active:scale-[0.99]"
            >
              <span className="flex items-center gap-2 font-medium text-primary">
                <Repeat className="size-4" />
                Já é um gasto fixo · ver
              </span>
              <ChevronRight className="size-4 text-primary/70" />
            </Link>
          ) : (
            <BotaoSubmit
              variant="outline"
              className="h-auto w-full justify-between gap-2 rounded-xl border-border/60 bg-card p-3 text-sm font-medium shadow-sm hover:bg-muted/50"
              pendingText="A marcar…"
            >
              <span className="flex items-center gap-2">
                <Repeat className="size-4 text-muted-foreground" />
                Marcar como gasto fixo
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </BotaoSubmit>
          )}
        </form>
      )}

      {/* Marcar como movimento (não conta como gasto/ganho) */}
      {transacao.is_movement ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-500/30 bg-slate-500/8 p-3 text-sm shadow-sm">
          <span className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300">
            <ArrowLeftRight className="size-4" />
            É um movimento
          </span>
          <form action={alternarMovimento}>
            <input type="hidden" name="transacao_id" value={transacao.id} />
            <input type="hidden" name="movimento" value="false" />
            <BotaoSubmit
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              pendingText="…"
            >
              Desfazer
            </BotaoSubmit>
          </form>
        </div>
      ) : (
        <form action={alternarMovimento}>
          <input type="hidden" name="transacao_id" value={transacao.id} />
          <input type="hidden" name="movimento" value="true" />
          <BotaoSubmit
            variant="outline"
            className="h-auto w-full justify-between gap-2 rounded-xl border-border/60 bg-card p-3 text-sm font-medium shadow-sm hover:bg-muted/50"
            pendingText="A marcar…"
          >
            <span className="flex items-center gap-2">
              <ArrowLeftRight className="size-4 text-muted-foreground" />
              Marcar como movimento
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </BotaoSubmit>
          <p className="mt-1.5 px-1 text-xs text-muted-foreground">
            Para dinheiro que vai e volta — reembolsos ou transferências entre
            as tuas contas. Deixa de contar como gasto ou ganho, mas continua no
            teu saldo.
          </p>
        </form>
      )}

      <form action={categorizarTransacao} className="flex flex-col gap-4">
        <input type="hidden" name="transacao_id" value={transacao.id} />
        <input type="hidden" name="nome_predefinido" value={nomePredefinido} />
        <input type="hidden" name="nome_global" value={nomeGlobal} />

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
            Dá um nome tipo “Intermarché”.
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

        {palavraChave && <OpcaoAprendizagem nomeComerciante={nomeGlobal} />}

        <BotaoSubmit pendingText="A guardar…">Guardar</BotaoSubmit>
      </form>
    </div>
  );
}
