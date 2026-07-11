import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { FormularioCategoria } from "@/components/form/formulario-categoria";
import { IconeCategoria } from "@/components/icone-categoria";
import { ModalSheet } from "@/components/modal-sheet";
import { SeletorCorCategoria } from "@/components/seletor-cor-categoria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { carregarCoresOverride, corCategoria } from "@/lib/cores";
import { createClient } from "@/lib/supabase/server";
import { apagarCategoria } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preenche o nome e o tipo da categoria.",
  criar: "Não foi possível criar a categoria.",
  cor: "Não foi possível mudar a cor.",
  apagar:
    "Não foi possível apagar — a categoria pode estar em uso por transações ou regras.",
};

interface Categoria {
  id: string;
  user_id: string | null;
  name: string;
  kind: string;
  color: string | null;
  icon: string | null;
}

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; form?: string }>;
}) {
  const { erro, form } = await searchParams;
  const supabase = await createClient();

  const [{ data: { user } }, { data: categoriasRaw }, overrides] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("categories")
        .select("id, user_id, name, kind, color, icon")
        .order("kind")
        .order("name"),
      carregarCoresOverride(supabase),
    ]);

  const categorias = (categoriasRaw ?? []) as Categoria[];
  const ganhos = categorias.filter((c) => c.kind === "income");
  const gastos = categorias.filter((c) => c.kind === "expense");

  const Lista = ({ titulo, itens }: { titulo: string; itens: Categoria[] }) => (
    <div className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-muted-foreground">
        {titulo}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {itens.map((c, i) => {
          const cor = corCategoria(overrides, c.id, c.color) ?? "#94a3b8";
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 p-3 ${i > 0 ? "border-t border-border/50" : ""}`}
            >
              <IconeCategoria icone={c.icon} cor={cor} className="size-9" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">
                {c.name}
              </p>
              <SeletorCorCategoria categoriaId={c.id} cor={cor} />
              {c.user_id === user?.id ? (
                <form action={apagarCategoria}>
                  <input type="hidden" name="categoria_id" value={c.id} />
                  <BotaoSubmit variant="ghost" size="icon-sm">
                    <Trash2 className="text-destructive" />
                  </BotaoSubmit>
                </form>
              ) : (
                <Badge variant="secondary">Base</Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
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
        <h1 className="text-xl font-bold">Categorias</h1>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        Toca no ponto de cor de qualquer categoria para a personalizar.
      </p>

      {erro && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {MENSAGENS_ERRO[erro] ?? "Ocorreu um erro."}
        </p>
      )}

      <Lista titulo="Gastos" itens={gastos} />
      <Lista titulo="Ganhos" itens={ganhos} />

      <Link
        href="/definicoes/categorias?form=categoria"
        scroll={false}
        aria-label="Nova categoria"
        className="fixed bottom-28 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </Link>

      <ModalSheet
        aberto={form === "categoria"}
        titulo="Nova categoria"
        voltarUrl="/definicoes/categorias"
      >
        <FormularioCategoria />
      </ModalSheet>
    </div>
  );
}
