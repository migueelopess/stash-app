import Link from "next/link";
import { ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { FiltrosTransacoes } from "@/components/filtros-transacoes";
import { IconeCategoria } from "@/components/icone-categoria";
import { PesquisaTransacoes } from "@/components/pesquisa-transacoes";
import { Button } from "@/components/ui/button";
import { formatarEuros } from "@/lib/format";
import {
  palavrasChaveParaPesquisa,
  resolverNome,
} from "@/lib/nomes-comerciantes";
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
  q?: string; // pesquisa
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

  // Nomes personalizados do utilizador (para mostrar e para pesquisar)
  const { data: nomesRaw } = await supabase
    .from("merchant_names")
    .select("match_value, display_name");
  const nomes = new Map(
    (nomesRaw ?? []).map((n) => [n.match_value, n.display_name])
  );

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

  // Pesquisa: texto cru + palavras-chave cujo nome bonito corresponde
  // (pesquisar "intermarché" também encontra as "INTERMA" do banco)
  const pesquisa = filtros.q?.trim();
  if (pesquisa) {
    const seguro = pesquisa.replace(/[,()"'\\%_]/g, " ").trim();
    const padroes = new Set<string>();
    if (seguro) {
      padroes.add(`description.ilike.*${seguro}*`);
      padroes.add(`counterparty.ilike.*${seguro}*`);
    }
    for (const palavra of palavrasChaveParaPesquisa(pesquisa, nomes)) {
      const limpa = palavra.replace(/[,()"'\\%_]/g, " ").trim();
      if (limpa) padroes.add(`description.ilike.*${limpa}*`);
    }
    if (padroes.size > 0) {
      query = query.or([...padroes].join(","));
    }
  }

  const [
    { data: transacoesRaw },
    { data: contas },
    { data: ligacoes },
    { count: nPendentes },
  ] = await Promise.all([
    query,
    supabase.from("accounts").select("id, name, iban").order("name"),
    supabase
      .from("bank_connections")
      .select("last_synced_at")
      .order("last_synced_at", { ascending: false })
      .limit(1),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .is("category_id", null),
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
  if (filtros.q) paramsProximos.set("q", filtros.q);
  paramsProximos.set("n", String(limite + POR_PAGINA));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          {ultimaSync && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sincronizado {formatoDia.format(new Date(ultimaSync))} às{" "}
              {formatoHora.format(new Date(ultimaSync))}
            </p>
          )}
        </div>
        <form action={sincronizarAgora}>
          <BotaoSubmit
            variant="outline"
            size="icon-lg"
            className="rounded-full shadow-sm"
            title="Sincronizar agora"
          >
            <RefreshCw className="size-4.5" />
          </BotaoSubmit>
        </form>
      </div>

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

      {(nPendentes ?? 0) > 0 && (
        <Link
          href="/transacoes/pendentes"
          className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/8 p-3 shadow-sm transition-all hover:bg-primary/12 active:scale-[0.99]"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="size-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {nPendentes} por categorizar
            </span>
            <span className="block text-xs text-muted-foreground">
              Trata delas todas de uma vez — a app aprende contigo
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      )}

      <PesquisaTransacoes />

      <FiltrosTransacoes contas={contas ?? []} meses={opcoesDeMes()} />

      {visiveis.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {pesquisa
            ? `Nada encontrado para “${pesquisa}”.`
            : "Sem transações para mostrar. Liga um banco e sincroniza."}
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
                        {resolverNome(t.description, t.counterparty, nomes)}
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
