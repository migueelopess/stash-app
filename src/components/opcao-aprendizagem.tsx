"use client";

import { useState } from "react";
import { Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Switch no formulário de categorização: por norma a app aprende e aplica a
 * todas as transações do comerciante; ligado, muda só esta linha (exceção
 * pontual — ex.: gasóleo comprado no Intermarché). Submete `apenas_esta`.
 */
export function OpcaoAprendizagem({ nomeComerciante }: { nomeComerciante: string }) {
  const [soEsta, setSoEsta] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-accent p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-accent-foreground">
          {soEsta ? (
            <Target className="size-4 shrink-0" />
          ) : (
            <Sparkles className="size-4 shrink-0" />
          )}
          Mudar só esta transação
        </span>
        <input
          type="checkbox"
          name="apenas_esta"
          checked={soEsta}
          onChange={(e) => setSoEsta(e.target.checked)}
          className="sr-only"
        />
        <span
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
            soEsta ? "bg-primary" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all",
              soEsta ? "left-[18px]" : "left-0.5"
            )}
          />
        </span>
      </label>
      <p className="text-xs text-muted-foreground">
        {soEsta ? (
          <>
            Só esta linha muda — as outras de{" "}
            <strong>{nomeComerciante}</strong> ficam na mesma.
          </>
        ) : (
          <>
            A app aprende e aplica a todas as transações de{" "}
            <strong>{nomeComerciante}</strong>.
          </>
        )}
      </p>
    </div>
  );
}
