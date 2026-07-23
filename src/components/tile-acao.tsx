"use client";

import { useFormStatus } from "react-dom";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Estilo base de um "tile" de ação: ícone em cima, rótulo pequeno em baixo. */
export const TILE_ACAO =
  "flex flex-1 basis-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-card p-3 text-[11px] font-medium shadow-sm transition-all hover:bg-muted/50 active:scale-95";

/**
 * Botão de submit em forma de tile (ícone + rótulo), com spinner no lugar do
 * ícone enquanto a Server Action corre. Tem de estar dentro de um <form>.
 */
export function TileSubmit({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(TILE_ACAO, className)}
    >
      {pending ? (
        <Loader2 className="size-5 animate-spin" />
      ) : (
        <Icon className="size-5" />
      )}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
