"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { TILE_ACAO } from "@/lib/estilos";
import { cn } from "@/lib/utils";

/**
 * Botão de submit em forma de tile (ícone + rótulo), com spinner no lugar do
 * ícone enquanto a Server Action corre. Tem de estar dentro de um <form>.
 * O ícone vem como elemento já criado (`<Icone/>`) — passar o componente em
 * si de um Server Component para aqui não é permitido em RSC.
 */
export function TileSubmit({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
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
      {pending ? <Loader2 className="size-5 animate-spin" /> : icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
