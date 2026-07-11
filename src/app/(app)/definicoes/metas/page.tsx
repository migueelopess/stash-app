import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { BarraProgresso } from "@/components/barra-progresso";
import { BotaoSubmit } from "@/components/botao-submit";
import { FormularioMeta } from "@/components/form/formulario-meta";
import { ModalSheet } from "@/components/modal-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData, formatarEuros } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { apagarMeta } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preenche o nome e um valor alvo válido.",
  criar: "Não foi possível criar a meta.",
  apagar: "Não foi possível apagar a meta.",
};

export default async function MetasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; form?: string }>;
}) {
  const { erro, form } = await searchParams;
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

      {(metas ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Sem metas ainda</p>
          <p className="text-xs text-muted-foreground">
            Toca no + para criares a primeira e acompanhares o progresso no
            dashboard.
          </p>
        </div>
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

      <Link
        href="/definicoes/metas?form=meta"
        scroll={false}
        aria-label="Nova meta"
        className="fixed bottom-28 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </Link>

      <ModalSheet
        aberto={form === "meta"}
        titulo="Nova meta"
        voltarUrl="/definicoes/metas"
      >
        <FormularioMeta />
      </ModalSheet>
    </div>
  );
}
