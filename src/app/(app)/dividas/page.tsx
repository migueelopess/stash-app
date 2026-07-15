import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  HandCoins,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { FormularioDivida } from "@/components/form/formulario-divida";
import { ModalSheet } from "@/components/modal-sheet";
import { Button } from "@/components/ui/button";
import { formatarData, formatarEuros } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { alternarSaldada, apagarDivida } from "./actions";

interface Divida {
  id: string;
  person: string;
  direction: "a_receber" | "a_pagar";
  amount: string;
  note: string | null;
  settled: boolean;
  created_at: string;
}

export default async function DividasPage({
  searchParams,
}: {
  searchParams: Promise<{
    erro?: string;
    form?: string;
    valor?: string;
    nome?: string;
    dir?: string;
    tx?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("debts")
    .select("id, person, direction, amount, note, settled, created_at")
    .order("settled")
    .order("created_at", { ascending: false });

  const dividas = (data ?? []) as Divida[];
  const aReceber = dividas.filter(
    (d) => d.direction === "a_receber" && !d.settled
  );
  const aPagar = dividas.filter(
    (d) => d.direction === "a_pagar" && !d.settled
  );
  const saldadas = dividas.filter((d) => d.settled);

  const totalReceber = aReceber.reduce((s, d) => s + Number(d.amount), 0);
  const totalPagar = aPagar.reduce((s, d) => s + Number(d.amount), 0);

  const Item = ({ d }: { d: Divida }) => (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm",
        d.settled && "opacity-60"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          d.direction === "a_receber"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
        )}
      >
        {d.direction === "a_receber" ? (
          <ArrowDownLeft className="size-5" />
        ) : (
          <ArrowUpRight className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold", d.settled && "line-through")}>
          {d.person}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {d.note ? `${d.note} · ` : ""}
          {formatarData(d.created_at.slice(0, 10))}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums">
        {formatarEuros(Number(d.amount))}
      </p>
      <div className="flex shrink-0 items-center">
        <form action={alternarSaldada}>
          <input type="hidden" name="divida_id" value={d.id} />
          <input type="hidden" name="saldar" value={d.settled ? "0" : "1"} />
          <BotaoSubmit
            variant="ghost"
            size="icon-sm"
            title={d.settled ? "Reabrir" : "Marcar como saldada"}
          >
            {d.settled ? (
              <RotateCcw className="text-muted-foreground" />
            ) : (
              <Check className="text-emerald-600 dark:text-emerald-400" />
            )}
          </BotaoSubmit>
        </form>
        <form action={apagarDivida}>
          <input type="hidden" name="divida_id" value={d.id} />
          <BotaoSubmit variant="ghost" size="icon-sm" title="Apagar">
            <Trash2 className="text-destructive" />
          </BotaoSubmit>
        </form>
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
          render={<Link href="/" />}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">Dívidas</h1>
      </div>

      {sp.erro && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível guardar. Verifica os dados.
        </p>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-emerald-500/12 p-4">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            A receber
          </p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatarEuros(totalReceber)}
          </p>
        </div>
        <div className="rounded-2xl bg-rose-500/12 p-4">
          <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
            A pagar
          </p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
            {formatarEuros(totalPagar)}
          </p>
        </div>
      </div>

      {dividas.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <HandCoins className="size-9 text-primary" />
          <p className="text-sm font-medium">Sem dívidas registadas</p>
          <p className="text-xs text-muted-foreground">
            Regista o que te devem (ou o que deves) — a partir de uma
            transação ou pelo +. A app soma tudo por ti.
          </p>
        </div>
      )}

      {aReceber.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm font-semibold text-muted-foreground">
            Devem-me
          </p>
          {aReceber.map((d) => (
            <Item key={d.id} d={d} />
          ))}
        </div>
      )}

      {aPagar.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-sm font-semibold text-muted-foreground">
            Devo
          </p>
          {aPagar.map((d) => (
            <Item key={d.id} d={d} />
          ))}
        </div>
      )}

      {saldadas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="px-1 pt-2 text-sm font-semibold text-muted-foreground">
            Saldadas
          </p>
          {saldadas.map((d) => (
            <Item key={d.id} d={d} />
          ))}
        </div>
      )}

      <Link
        href="/dividas?form=nova"
        scroll={false}
        aria-label="Nova dívida"
        className="fixed bottom-28 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </Link>

      <ModalSheet
        aberto={sp.form === "nova"}
        titulo="Nova dívida"
        voltarUrl="/dividas"
      >
        <FormularioDivida
          valorInicial={sp.valor}
          nomeInicial={sp.nome}
          direcaoInicial={sp.dir === "a_pagar" ? "a_pagar" : "a_receber"}
          transactionId={sp.tx}
        />
      </ModalSheet>
    </div>
  );
}
