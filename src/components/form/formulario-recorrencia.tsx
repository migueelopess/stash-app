"use client";

import { BotaoSubmit } from "@/components/botao-submit";
import { Segmentado } from "@/components/form/segmentado";
import { criarRecorrenciaManual } from "@/app/(app)/recorrencias/actions";

interface Categoria {
  id: string;
  name: string;
}

export function FormularioRecorrencia({
  categorias,
}: {
  categorias: Categoria[];
}) {
  return (
    <form action={criarRecorrenciaManual} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm font-medium text-muted-foreground">
          Nome
        </label>
        <input
          id="name"
          name="name"
          placeholder="Ex.: Ginásio, Seguro do carro…"
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
            placeholder="0,00"
            required
            className="h-12 w-full rounded-2xl border border-border/60 bg-background pl-9 pr-4 text-lg font-semibold shadow-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">
          Frequência
        </label>
        <Segmentado
          name="cadence"
          valorInicial="monthly"
          opcoes={[
            { valor: "weekly", rotulo: "Semanal" },
            { valor: "monthly", rotulo: "Mensal" },
            { valor: "yearly", rotulo: "Anual" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="category_id" className="text-sm font-medium text-muted-foreground">
            Categoria
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue=""
            className="h-12 rounded-2xl border border-border/60 bg-background px-3 text-sm shadow-sm"
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="next_date" className="text-sm font-medium text-muted-foreground">
            Próxima (opcional)
          </label>
          <input
            id="next_date"
            name="next_date"
            type="date"
            className="h-12 rounded-2xl border border-border/60 bg-background px-3 text-sm shadow-sm outline-none focus:border-ring"
          />
        </div>
      </div>

      <BotaoSubmit
        className="mt-1 h-12 w-full rounded-2xl text-base"
        pendingText="A criar…"
      >
        Criar gasto fixo
      </BotaoSubmit>
    </form>
  );
}
