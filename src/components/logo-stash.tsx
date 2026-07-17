import { cn } from "@/lib/utils";
import marca from "@/lib/marca-stash.json";

/**
 * Marca da Stash: o "S" de moedas empilhadas, traçado 1:1 do logo original.
 * A cor vem de `currentColor` (usa text-*). Com `animado`, entra com
 * pop + fade (keyframes stash-entrar em globals.css).
 * Se a marca mudar, atualiza src/lib/marca-stash.json e corre
 * `node scripts/gerar-icones.mjs` para regenerar os ícones do PWA.
 */
export function LogoStash({
  className,
  animado = false,
}: {
  className?: string;
  animado?: boolean;
}) {
  return (
    <svg
      viewBox={marca.viewBox}
      fill="currentColor"
      aria-hidden
      className={cn(animado && "logo-entrar", className)}
    >
      <path fillRule="evenodd" d={marca.d} />
    </svg>
  );
}
