import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  HandCoins,
  Repeat,
  Store,
} from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { IconeCategoria } from "@/components/icone-categoria";
import { OpcaoAprendizagem } from "@/components/opcao-aprendizagem";
import { TileSubmit } from "@/components/tile-acao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extrairPalavraChave } from "@/lib/categorizacao";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { TILE_ACAO } from "@/lib/estilos";
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
  categories: { name: string; color: string | null; icon: string | null } | null;
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

  const [{ data }, overrides] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, booking_date, amount, currency, description, counterparty, category_id, categorized_by, is_movement, custom_name, accounts (name, iban), categories (name, color, icon)"
      )
      .eq("id", id)
      .maybeSingle(),
    carregarCoresOverride(supabase),
  ]);

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
  // Predefinido = sem personalizações (base para saber se há nome próprio)
  const nomePredefinido = resolverNome(
    transacao.description,
    transacao.counterparty,
    new Map()
  );
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

  const cor = corCategoria(
    overrides,
    transacao.category_id,
    transacao.categories?.color
  );
  const ganho = !transacao.is_movement && valor > 0;

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
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {erro === "regra"
            ? "A categoria foi guardada mas a regra falhou."
            : "Não foi possível guardar. Tenta novamente."}
        </p>
      )}

      {/* Hero da transação */}
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-6 text-center shadow-sm">
        <IconeCategoria
          icone={transacao.categories?.icon}
          cor={cor}
          ganho={ganho}
          movimento={transacao.is_movement}
          className="size-14"
        />
        <div>
          <p
            className={cn(
              "text-3xl font-extrabold tabular-nums tracking-tight",
              transacao.is_movement
                ? "text-muted-foreground"
                : ganho && "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {ganho ? "+" : ""}
            {formatarEuros(transacao.amount)}
          </p>
          <p className="mt-1 truncate text-base font-semibold">{nomeAtual}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatarData(transacao.booking_date)}
            {transacao.accounts?.name ? ` · ${transacao.accounts.name}` : ""}
            {transacao.categories?.name ? ` · ${transacao.categories.name}` : ""}
          </p>
        </div>
        {transacao.is_movement && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            <ArrowLeftRight className="size-3.5" />
            Movimento · fora dos gastos e ganhos
          </p>
        )}
      </div>

      {/* Ações rápidas */}
      <div className="flex gap-2">
        {palavraChave && (
          <Link
            href={`/comerciante/${encodeURIComponent(palavraChave)}`}
            className={TILE_ACAO}
          >
            <Store className="size-5 text-muted-foreground" />
            Histórico
          </Link>
        )}

        <Link
          href={`/dividas?form=nova&valor=${Math.abs(valor).toFixed(2)}${
            transacao.counterparty
              ? `&nome=${encodeURIComponent(transacao.counterparty)}`
              : ""
          }&dir=${valor < 0 ? "a_receber" : "a_pagar"}&tx=${transacao.id}`}
          className={TILE_ACAO}
        >
          <HandCoins className="size-5 text-muted-foreground" />
          Dívida
        </Link>

        {valor < 0 && chaveFixo && !transacao.is_movement && (
          jaFixo ? (
            <Link
              href="/recorrencias"
              className={cn(
                TILE_ACAO,
                "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
              )}
            >
              <Repeat className="size-5" />
              Gasto fixo
            </Link>
          ) : (
            <form action={confirmarRecorrencia} className="flex flex-1 basis-0">
              <input type="hidden" name="chave" value={chaveFixo} />
              <input
                type="hidden"
                name="voltar"
                value={`/transacoes/${transacao.id}`}
              />
              <TileSubmit
                icon={<Repeat className="size-5" />}
                label="Gasto fixo"
              />
            </form>
          )
        )}

        <form action={alternarMovimento} className="flex flex-1 basis-0">
          <input type="hidden" name="transacao_id" value={transacao.id} />
          <input
            type="hidden"
            name="movimento"
            value={transacao.is_movement ? "false" : "true"}
          />
          <TileSubmit
            icon={<ArrowLeftRight className="size-5" />}
            label={transacao.is_movement ? "É movimento" : "Movimento"}
            className={cn(
              transacao.is_movement &&
                "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300"
            )}
          />
        </form>
      </div>
      {!transacao.is_movement && (
        <p className="-mt-2 px-1 text-xs text-muted-foreground">
          Movimento = dinheiro que vai e volta (reembolsos, transferências
          entre contas). Fica fora dos gastos e ganhos.
        </p>
      )}

      {/* Editar */}
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
