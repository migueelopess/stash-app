"use client";

import { useFormStatus } from "react-dom";
import { Loader2, type LucideIcon } from "lucide-react";
import { TILE_ACAO } from "@/lib/estilos";
import { cn } from "@/lib/utils";

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
