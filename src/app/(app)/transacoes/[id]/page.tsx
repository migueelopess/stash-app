import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarData, formatarEuros } from "@/lib/format";
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
  const { data: categorias } = await supabase
    .from("categories")
    .select("id, name, kind")
    .eq("kind", valor > 0 ? "income" : "expense")
    .order("name");

  const valorSugerido = transacao.counterparty ?? transacao.description ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
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
            <span className="truncate">
              {transacao.counterparty ?? "Transação"}
            </span>
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="category_id">Categoria</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={transacao.category_id ?? ""}
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">Por categorizar</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Regra automática (opcional)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="criar_regra" className="size-4" />
              Categorizar sempre assim transações parecidas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                name="match_field"
                defaultValue={transacao.counterparty ? "counterparty" : "description"}
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="counterparty">Se a entidade contiver</option>
                <option value="description">Se a descrição contiver</option>
              </select>
              <Input
                name="match_value"
                defaultValue={valorSugerido}
                placeholder="texto a procurar"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="aplicar_pendentes"
                defaultChecked
                className="size-4"
              />
              Aplicar já às transações por categorizar
            </label>
          </CardContent>
        </Card>

        <Button type="submit">Guardar</Button>
      </form>
    </div>
  );
}
