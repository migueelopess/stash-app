"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Opcao {
  valor: string;
  rotulo: string;
}

/** Controlo segmentado (pílulas) que escreve o valor num input escondido. */
export function Segmentado({
  name,
  opcoes,
  valorInicial,
  onChange,
}: {
  name: string;
  opcoes: Opcao[];
  valorInicial: string;
  onChange?: (valor: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);

  return (
    <div
      className="grid gap-1 rounded-2xl bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }}
    >
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => {
            setValor(o.valor);
            onChange?.(o.valor);
          }}
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-semibold transition-all",
            valor === o.valor
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.rotulo}
        </button>
      ))}
      <input type="hidden" name={name} value={valor} />
    </div>
  );
}
