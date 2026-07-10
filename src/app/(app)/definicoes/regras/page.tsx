import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { apagarRegra } from "./actions";

const CAMPOS: Record<string, string> = {
  description: "descrição",
  counterparty: "entidade",
  amount: "valor",
};

const TIPOS: Record<string, string> = {
  contains: "contém",
  equals: "é igual a",
  regex: "contém a palavra",
  between: "está entre",
};

// As regras aprendidas guardam regex com \b — mostrar só a palavra
function valorLegivel(match_value: string): string {
  return match_value.replace(/\\b/g, "").replace(/\\(.)/g, "$1");
}

interface Regra {
  id: string;
  priority: number;
  match_field: string;
  match_type: string;
  match_value: string;
  categories: { name: string } | null;
}

export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("categorization_rules")
    .select("id, priority, match_field, match_type, match_value, categories (name)")
    .order("priority")
    .order("match_value");
  const regras = (data ?? []) as unknown as Regra[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/definicoes" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-semibold">Regras de categorização</h1>
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível apagar a regra. Tenta novamente.
        </p>
      )}

      {regras.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ainda não há regras. Cria uma ao categorizar uma transação — a app
          passa a categorizar sozinha as parecidas.
        </p>
      )}

      {regras.map((r) => (
        <div
          key={r.id}
          className="flex items-center justify-between gap-3 rounded-md border p-3"
        >
          <div className="min-w-0 text-sm">
            <p>
              Se a <strong>{CAMPOS[r.match_field] ?? r.match_field}</strong>{" "}
              {TIPOS[r.match_type] ?? r.match_type}{" "}
              <strong>“{valorLegivel(r.match_value)}”</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              → {r.categories?.name ?? "categoria removida"}
            </p>
          </div>
          <form action={apagarRegra}>
            <input type="hidden" name="regra_id" value={r.id} />
            <BotaoSubmit variant="ghost" size="icon-sm">
              <Trash2 className="text-destructive" />
            </BotaoSubmit>
          </form>
        </div>
      ))}
    </div>
  );
}
