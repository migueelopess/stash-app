"use client";

import { useState } from "react";
import { Gauge } from "lucide-react";
import { BotaoSubmit } from "@/components/botao-submit";
import { IconeCategoria } from "@/components/icone-categoria";
import { Segmentado } from "@/components/form/segmentado";
import { criarOrcamento } from "@/app/(app)/orcamentos/actions";
import { cn } from "@/lib/utils";

interface Categoria {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export function FormularioOrcamento({
  categorias,
  temGlobal,
}: {
  categorias: Categoria[];
  temGlobal: boolean;
}) {
  const [alvo, setAlvo] = useState<"global" | "categoria">(
    temGlobal ? "categoria" : "global"
  );
  const [categoriaId, setCategoriaId] = useState<string>("");

  const podeSubmeter = alvo === "global" || categoriaId !== "";

  return (
    <form action={criarOrcamento} className="flex flex-col gap-4">
      {/* Alvo: todos os gastos vs. uma categoria */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          O que queres limitar
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAlvo("global")}
            disabled={temGlobal}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition-all disabled:opacity-40",
              alvo === "global"
                ? "border-primary bg-primary/8 text-foreground ring-1 ring-primary"
                : "border-border/60 text-muted-foreground"
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Gauge className="size-5" />
            </span>
            Todos os gastos
          </button>
          <button
            type="button"
            onClick={() => setAlvo("categoria")}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition-all",
              alvo === "categoria"
                ? "border-primary bg-primary/8 text-foreground ring-1 ring-primary"
                : "border-border/60 text-muted-foreground"
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              🏷️
            </span>
            Uma categoria
          </button>
        </div>
        {temGlobal && alvo === "global" && (
          <p className="text-xs text-muted-foreground">
            Já tens um orçamento global.
          </p>
        )}
      </div>

      {/* Chips de categoria */}
      {alvo === "categoria" && (
        <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoriaId(c.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2 text-left text-sm transition-all",
                categoriaId === c.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border/60"
              )}
            >
              <IconeCategoria icone={c.icon} cor={c.color} className="size-8" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="hidden"
        name="category_id"
        value={alvo === "global" ? "global" : categoriaId}
      />

      {/* Valor */}
      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
          Limite
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
            min="1"
            inputMode="decimal"
            placeholder="0,00"
            required
            className="h-12 w-full rounded-2xl border border-border/60 bg-background pl-9 pr-4 text-lg font-semibold shadow-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      {/* Período */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Período
        </label>
        <Segmentado
          name="period"
          valorInicial="monthly"
          opcoes={[
            { valor: "weekly", rotulo: "Semanal" },
            { valor: "monthly", rotulo: "Mensal" },
            { valor: "yearly", rotulo: "Anual" },
          ]}
        />
      </div>

      <BotaoSubmit
        className="mt-1 h-12 w-full rounded-2xl text-base"
        pendingText="A criar…"
        disabled={!podeSubmeter}
      >
        Criar orçamento
      </BotaoSubmit>
    </form>
  );
}
