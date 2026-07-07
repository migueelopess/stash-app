import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { apagarCategoria, criarCategoria } from "./actions";

const MENSAGENS_ERRO: Record<string, string> = {
  dados: "Preenche o nome e o tipo da categoria.",
  criar: "Não foi possível criar a categoria.",
  apagar:
    "Não foi possível apagar — a categoria pode estar em uso por transações ou regras.",
};

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: categorias } = await supabase
    .from("categories")
    .select("id, user_id, name, kind")
    .order("kind")
    .order("name");

  const ganhos = (categorias ?? []).filter((c) => c.kind === "income");
  const gastos = (categorias ?? []).filter((c) => c.kind === "expense");

  const Lista = ({ titulo, itens }: { titulo: string; itens: typeof ganhos }) => (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{titulo}</h2>
      {itens.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between gap-2 rounded-md border p-3"
        >
          <p className="text-sm">{c.name}</p>
          {c.user_id === user?.id ? (
            <form action={apagarCategoria}>
              <input type="hidden" name="categoria_id" value={c.id} />
              <Button type="submit" variant="ghost" size="icon-sm">
                <Trash2 className="text-destructive" />
              </Button>
            </form>
          ) : (
            <Badge variant="secondary">Base</Badge>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/definicoes" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-semibold">Categorias</h1>
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {MENSAGENS_ERRO[erro] ?? "Ocorreu um erro."}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarCategoria} className="grid grid-cols-3 gap-2">
            <Input
              name="name"
              placeholder="Nome"
              required
              className="col-span-2"
            />
            <select
              name="kind"
              defaultValue="expense"
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="expense">Gasto</option>
              <option value="income">Ganho</option>
            </select>
            <Button type="submit" size="sm" className="col-span-3">
              Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Lista titulo="Ganhos" itens={ganhos} />
      <Lista titulo="Gastos" itens={gastos} />
    </div>
  );
}
