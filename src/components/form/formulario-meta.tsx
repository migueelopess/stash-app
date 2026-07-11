"use client";

import { BotaoSubmit } from "@/components/botao-submit";
import { criarMeta } from "@/app/(app)/definicoes/metas/actions";

export function FormularioMeta() {
  return (
    <form action={criarMeta} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
          Nome da meta
        </label>
        <input
          id="name"
          name="name"
          placeholder="Portátil novo"
          required
          className="h-12 w-full rounded-2xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus:border-ring"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="target_amount"
          className="text-sm font-medium text-muted-foreground"
        >
          Objetivo
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
            €
          </span>
          <input
            id="target_amount"
            name="target_amount"
            type="number"
            step="0.01"
            min="1"
            inputMode="decimal"
            placeholder="0,00"
            required
            className="h-12 w-full rounded-2xl border border-border/60 bg-background pl-9 pr-4 text-lg font-semibold shadow-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="target_date"
          className="text-sm font-medium text-muted-foreground"
        >
          Data alvo (opcional)
        </label>
        <input
          id="target_date"
          name="target_date"
          type="date"
          className="h-12 w-full rounded-2xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus:border-ring"
        />
      </div>

      <BotaoSubmit
        className="mt-1 h-12 w-full rounded-2xl text-base"
        pendingText="A criar…"
      >
        Criar meta
      </BotaoSubmit>
    </form>
  );
}
