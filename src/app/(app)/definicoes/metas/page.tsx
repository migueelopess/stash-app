import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
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
import { formatarData, formatarEuros } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { apagarMeta, criarMeta } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preenche o nome e um valor alvo válido.",
  criar: "Não foi possível criar a meta.",
  apagar: "Não foi possível apagar a meta.",
};

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: metas }, { data: contas }] = await Promise.all([
    supabase
      .from("goals")
      .select("id, name, target_amount, target_date")
      .order("created_at"),
    supabase.from("accounts").select("balance"),
  ]);

  const saldoTotal = (contas ?? []).reduce(
    (soma, c) => soma + Number(c.balance ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/definicoes" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Metas de poupança</h1>
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {MENSAGENS_ERRO[erro] ?? "Ocorreu um erro."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nova meta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarMeta} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" placeholder="Portátil novo" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="target_amount">Valor (€)</Label>
                <Input
                  id="target_amount"
                  name="target_amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="1000"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="target_date">Data alvo (opcional)</Label>
                <Input id="target_date" name="target_date" type="date" />
              </div>
            </div>
            <BotaoSubmit size="sm" pendingText="A criar…">
              Criar meta
            </BotaoSubmit>
          </form>
        </CardContent>
      </Card>

      {(metas ?? []).length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sem metas ainda. Cria a primeira para acompanhares o progresso no
          dashboard.
        </p>
      )}

      {(metas ?? []).map((meta) => {
        const alvo = Number(meta.target_amount);
        const percentagem = alvo > 0 ? (saldoTotal / alvo) * 100 : 0;
        return (
          <Card key={meta.id}>
            <CardContent className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{meta.name}</p>
                <form action={apagarMeta}>
                  <input type="hidden" name="meta_id" value={meta.id} />
                  <BotaoSubmit variant="ghost" size="icon-sm">
                    <Trash2 className="text-destructive" />
                  </BotaoSubmit>
                </form>
              </div>
              <BarraProgresso percentagem={percentagem} />
              <p className="text-xs text-muted-foreground">
                {formatarEuros(saldoTotal)} de {formatarEuros(alvo)} (
                {Math.min(100, Math.round(percentagem))}%)
                {meta.target_date
                  ? ` · até ${formatarData(meta.target_date)}`
                  : ""}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
