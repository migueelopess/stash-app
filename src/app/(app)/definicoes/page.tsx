import Link from "next/link";
import { ChevronRight, ListChecks, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

const seccoes = [
  {
    href: "/definicoes/categorias",
    titulo: "Categorias",
    descricao: "Gerir categorias de ganhos e gastos",
    icon: Tags,
  },
  {
    href: "/definicoes/regras",
    titulo: "Regras de categorização",
    descricao: "Regras que categorizam transações sozinhas",
    icon: ListChecks,
  },
];

export default async function DefinicoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Definições</h1>

      <div className="flex flex-col gap-2">
        {seccoes.map(({ href, titulo, descricao, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <Icon className="size-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{titulo}</p>
              <p className="truncate text-xs text-muted-foreground">
                {descricao}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Sessão iniciada como</p>
        <p className="text-sm font-medium">{user?.email}</p>
      </div>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Terminar sessão
        </Button>
      </form>
    </div>
  );
}
