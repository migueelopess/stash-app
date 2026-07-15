"use client";

import { BotaoSubmit } from "@/components/botao-submit";
import { Segmentado } from "@/components/form/segmentado";
import { criarDivida } from "@/app/(app)/dividas/actions";

export function FormularioDivida({
  valorInicial,
  nomeInicial,
  direcaoInicial,
  transactionId,
}: {
  valorInicial?: string;
  nomeInicial?: string;
  direcaoInicial?: "a_receber" | "a_pagar";
  transactionId?: string;
}) {
  return (
    <form action={criarDivida} className="flex flex-col gap-4">
      {transactionId && (
        <input type="hidden" name="transaction_id" value={transactionId} />
      )}

      <Segmentado
        name="direction"
        valorInicial={direcaoInicial ?? "a_receber"}
        opcoes={[
          { valor: "a_receber", rotulo: "Devem-me" },
          { valor: "a_pagar", rotulo: "Devo" },
        ]}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="person" className="text-sm font-medium text-muted-foreground">
          Pessoa
        </label>
        <input
          id="person"
          name="person"
          defaultValue={nomeInicial}
          placeholder="Ex.: João"
          required
          className="h-12 w-full rounded-2xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus:border-ring"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
          Valor
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
            €
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            defaultValue={valorInicial}
            placeholder="0,00"
            required
            className="h-12 w-full rounded-2xl border border-border/60 bg-background pl-9 pr-4 text-lg font-semibold shadow-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="note" className="text-sm font-medium text-muted-foreground">
          Nota (opcional)
        </label>
        <input
          id="note"
          name="note"
          placeholder="Ex.: jantar de sexta"
          className="h-12 w-full rounded-2xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus:border-ring"
        />
      </div>

      <BotaoSubmit
        className="mt-1 h-12 w-full rounded-2xl text-base"
        pendingText="A registar…"
      >
        Registar
      </BotaoSubmit>
    </form>
  );
}
