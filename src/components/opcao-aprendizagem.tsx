"use client";

import { useState } from "react";
import { Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Switch no formulário de categorização. Por defeito ligado: a app aprende e
 * aplica a todas as transações do comerciante. Desligado = exceção pontual,
 * muda só esta linha (ex.: gasóleo comprado no Intermarché). Submete `lembrar`.
 */
export function OpcaoAprendizagem({ nomeComerciante }: { nomeComerciante: string }) {
  const [lembrar, setLembrar] = useState(true);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-accent p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
          {lembrar ? (
            <Sparkles className="size-4 shrink-0" />
          ) : (
            <Target className="size-4 shrink-0" />
          )}
          A app lembra-se para as próximas
        </span>
        <input
          type="checkbox"
          name="lembrar"
          checked={lembrar}
          onChange={(e) => setLembrar(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
            lembrar ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
              lembrar ? "left-[18px]" : "left-0.5"
            )}
          />
        </span>
      </label>
      <p className="text-xs text-muted-foreground">
        {lembrar ? (
          <>
            Aplica a todas as transações de <strong>{nomeComerciante}</strong>.
          </>
        ) : (
          <>
            Exceção: só esta linha muda — as outras de{" "}
            <strong>{nomeComerciante}</strong> ficam na mesma.
          </>
        )}
      </p>
    </div>
  );
}
