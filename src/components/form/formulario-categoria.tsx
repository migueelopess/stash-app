"use client";

import { BotaoSubmit } from "@/components/botao-submit";
import { Segmentado } from "@/components/form/segmentado";
import { SeletorCor } from "@/components/form/seletor-cor";
import { criarCategoria } from "@/app/(app)/definicoes/categorias/actions";

export function FormularioCategoria() {
  return (
    <form action={criarCategoria} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
          Nome
        </label>
        <input
          id="name"
          name="name"
          placeholder="Ex.: Café, Ginásio…"
          required
          className="h-12 w-full rounded-2xl border border-border/60 bg-background px-4 text-base shadow-sm outline-none focus:border-ring"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Tipo</label>
        <Segmentado
          name="kind"
          valorInicial="expense"
          opcoes={[
            { valor: "expense", rotulo: "Gasto" },
            { valor: "income", rotulo: "Ganho" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">Cor</label>
        <SeletorCor name="color" />
      </div>

      <BotaoSubmit
        className="mt-1 h-12 w-full rounded-2xl text-base"
        pendingText="A criar…"
      >
        Criar categoria
      </BotaoSubmit>
    </form>
  );
}
