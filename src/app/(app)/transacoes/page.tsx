import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { IconeCategoria } from "@/components/icone-categoria";
import { Button } from "@/components/ui/button";
import { formatarEuros, tituloTransacao } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { sincronizarAgora } from "./actions";

const POR_PAGINA = 50;

const formatoDia = new Intl.DateTimeFormat("pt-PT", {
  weekday: "short",
  day: "numeric",
  month: "long",
});

const formatoMes = new Intl.DateTimeFormat("pt-PT", {
  month: "long",
  year: "numeric",
});

const formatoHora = new Intl.DateTimeFormat("pt-PT", {
  hour: "2-digit",
  minute: "2-digit",
});

interface Filtros {
  mes?: string; // "2026-07"
  tipo?: string; // ganhos | gastos
  conta?: string; // uuid
  n?: string; // quantas mostrar
  sync?: string;
  novas?: string;
}

interface Transacao {
  id: string;
  booking_date: string;
  amount: string;
  description: string | null;
  counterparty: string | null;
  categories: {
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

function opcoesDeMes(): { valor: string; rotulo: string }[] {
  const opcoes = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    opcoes.push({
      valor: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      rotulo: formatoMes.format(d),
    });
    d.setMonth(d.getMonth() - 1);
  }
  return opcoes;
}

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const filtros = await searchParams;
  const limite = Math.max(Number(filtros.n) || POR_PAGINA, POR_PAGINA);
  const supabase = await createClient();

  let query = supabase
    .from("transactions")
    .select(
      "id, booking_date, amount, description, counterparty, categories (name, color, icon)"
    )
    .order("booking_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limite + 1);

  if (filtros.mes) {
    const [ano, mes] = filtros.mes.split("-").map(Number);
    const inicio = `${filtros.mes}-01`;
    const fim = new Date(ano, mes, 1); // 1.º dia do mês seguinte
    query = query
      .gte("booking_date", inicio)
      .lt("booking_date", fim.toISOString().slice(0, 10));
  }
  if (filtros.tipo === "ganhos") query = query.gt("amount", 0);
  if (filtros.tipo === "gastos") query = query.lt("amount", 0);
  if (filtros.conta) query = query.eq("account_id", filtros.conta);

  const [{ data: transacoesRaw }, { data: contas }, { data: ligacoes }] =
    await Promise.all([
      query,
      supabase.from("accounts").select("id, name, iban").order("name"),
      supabase
        .from("bank_connections")
        .select("last_synced_at")
        .order("last_synced_at", { ascending: false })
        .limit(1),
    ]);

  const transacoes = (transacoesRaw ?? []) as unknown as Transacao[];
  const haMais = transacoes.length > limite;
  const visiveis = haMais ? transacoes.slice(0, limite) : transacoes;

  // Agrupar por dia
  const grupos = new Map<string, Transacao[]>();
  for (const t of visiveis) {
    const grupo = grupos.get(t.booking_date) ?? [];
    grupo.push(t);
    grupos.set(t.booking_date, grupo);
  }

  const ultimaSync = ligacoes?.[0]?.last_synced_at;

  // Preservar filtros no link "carregar mais"
  const paramsProximos = new URLSearchParams();
  if (filtros.mes) paramsProximos.set("mes", filtros.mes);
  if (filtros.tipo) paramsProximos.set("tipo", filtros.tipo);
  if (filtros.conta) paramsProximos.set("conta", filtros.conta);
  paramsProximos.set("n", String(limite + POR_PAGINA));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transações</h1>
        <form action={sincronizarAgora}>
          <Button type="submit" variant="outline" size="sm">
            <RefreshCw className="size-4" />
            Sincronizar
          </Button>
        </form>
      </div>

      {ultimaSync && (
        <p className="text-xs text-muted-foreground">
          Última sincronização:{" "}
          {formatoDia.format(new Date(ultimaSync))} às{" "}
          {formatoHora.format(new Date(ultimaSync))}
        </p>
      )}

      {filtros.sync === "ok" && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Sincronizado.{" "}
          {Number(filtros.novas) > 0
            ? `${filtros.novas} ${Number(filtros.novas) === 1 ? "transação nova" : "transações novas"}.`
            : "Sem transações novas."}
        </p>
      )}
      {filtros.sync === "erro" && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          A sincronização falhou nalgumas contas. Tenta novamente.
        </p>
      )}

      <form method="GET" className="grid grid-cols-3 gap-2">
        <select
          name="mes"
          defaultValue={filtros.mes ?? ""}
          className="h-9 rounded-xl border border-border/60 bg-card px-2 text-sm shadow-sm"
        >
          <option value="">Todos os meses</option>
          {opcoesDeMes().map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.rotulo}
            </option>
          ))}
        </select>
        <select
          name="tipo"
          defaultValue={filtros.tipo ?? ""}
          className="h-9 rounded-xl border border-border/60 bg-card px-2 text-sm shadow-sm"
        >
          <option value="">Tudo</option>
          <option value="ganhos">Ganhos</option>
          <option value="gastos">Gastos</option>
        </select>
        <select
          name="conta"
          defaultValue={filtros.conta ?? ""}
          className="h-9 rounded-xl border border-border/60 bg-card px-2 text-sm shadow-sm"
        >
          <option value="">Todas as contas</option>
          {(contas ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.iban ?? "Conta"}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm" className="col-span-3">
          Filtrar
        </Button>
      </form>

      {visiveis.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sem transações para mostrar. Liga um banco e sincroniza.
        </p>
      )}

      {[...grupos.entries()].map(([dia, linhas]) => {
        const totalDia = linhas.reduce((soma, t) => soma + Number(t.amount), 0);
        return (
          <div
            key={dia}
            className="flex flex-col gap-1.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-400"
          >
            <div className="flex items-baseline justify-between pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {formatoDia.format(new Date(dia))}
              </p>
              <p
                className={cn(
                  "text-xs font-medium tabular-nums text-muted-foreground",
                  totalDia > 0 && "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {totalDia > 0 ? "+" : ""}
                {formatarEuros(totalDia)}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
              {linhas.map((t, i) => {
                const valor = Number(t.amount);
                return (
                  <Link
                    key={t.id}
                    href={`/transacoes/${t.id}`}
                    className={cn(
                      "flex items-center gap-3 p-3 transition-all hover:bg-muted/50 active:scale-[0.985] active:bg-muted/60",
                      i > 0 && "border-t border-border/50"
                    )}
                  >
                    <IconeCategoria
                      icone={t.categories?.icon}
                      cor={t.categories?.color}
                      ganho={valor > 0}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {tituloTransacao(t.counterparty, t.description)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.categories?.name ?? "Por categorizar"}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        valor > 0 && "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {valor > 0 ? "+" : ""}
                      {formatarEuros(t.amount)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {haMais && (
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/transacoes?${paramsProximos.toString()}`} />}
        >
          Carregar mais
        </Button>
      )}
    </div>
  );
}
