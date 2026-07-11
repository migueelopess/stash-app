"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PALETA } from "@/lib/paleta";
import { cn } from "@/lib/utils";

/** Grelha de cores; escreve o hex escolhido num input escondido. */
export function SeletorCor({
  name,
  valorInicial,
}: {
  name: string;
  valorInicial?: string;
}) {
  const [cor, setCor] = useState(valorInicial ?? PALETA[5]);

  return (
    <div className="flex flex-wrap gap-2">
      {PALETA.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Cor ${c}`}
          onClick={() => setCor(c)}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-transform",
            cor === c ? "scale-110 ring-2 ring-offset-2 ring-offset-card" : ""
          )}
          style={{ backgroundColor: c, boxShadow: cor === c ? `0 0 0 2px ${c}` : undefined }}
        >
          {cor === c && <Check className="size-4 text-white" strokeWidth={3} />}
        </button>
      ))}
      <input type="hidden" name={name} value={cor} />
    </div>
  );
}
