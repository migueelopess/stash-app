import Link from "next/link";
import { ChevronRight, ListChecks, PiggyBank, Tags } from "lucide-react";
import { AtivarNotificacoes } from "@/components/ativar-notificacoes";
import { SeletorTema } from "@/components/seletor-tema";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

const seccoes = [
  {
    href: "/definicoes/categorias",
    titulo: "Categorias",
    descricao: "Gerir categorias de ganhos e gastos",
    icon: Tags,
    cor: "#f97316",
  },
  {
    href: "/definicoes/regras",
    titulo: "Regras de categorização",
    descricao: "Regras que categorizam transações sozinhas",
    icon: ListChecks,
    cor: "#3b82f6",
  },
  {
    href: "/definicoes/metas",
    titulo: "Metas de poupança",
    descricao: "Objetivos e progresso da tua poupança",
    icon: PiggyBank,
    cor: "#8b5cf6",
  },
];

export default async function DefinicoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <h1 className="text-2xl font-bold">Definições</h1>

      <div className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">
          Aparência
        </h2>
        <SeletorTema />
      </div>

      <AtivarNotificacoes />

      <div className="flex flex-col gap-2">
        {seccoes.map(({ href, titulo, descricao, icon: Icon, cor }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-colors hover:bg-muted/50"
          >
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${cor}1f`, color: cor }}
            >
              <Icon className="size-5" />
            </span>
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
