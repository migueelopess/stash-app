import { cn } from "@/lib/utils";

/**
 * Marca da Stash: "S" formado por moedas empilhadas, estilo néon.
 * A cor vem de `currentColor` (usa text-*). Com `animado`, cada traço
 * desenha-se em sequência (keyframes stash-tracar em globals.css).
 * Se alterares os paths, corre `node scripts/gerar-icones.mjs` para
 * regenerar os ícones do PWA.
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
      viewBox="5 -3.75 110 110"
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap="round"
      aria-hidden
      className={cn(animado && "logo-tracar", className)}
    >
      <ellipse cx="60" cy="22" rx="26" ry="10.5" pathLength={100} />
      <path d="M86 22 v3 c0 7 -5 11 -12 12" pathLength={100} />
      <path
        d="M34 22 v8 c0 8 11 12 26 12 h13 c9 0 9 10 -3 10 H50 c-10 0 -16 6 -16 12 v2"
        pathLength={100}
      />
      <ellipse cx="60" cy="68" rx="26" ry="10.5" pathLength={100} />
      <path d="M34 68 v12 c0 7 11 11 26 11 s26 -4 26 -11 V68" pathLength={100} />
      <path d="M34 74 c0 7 11 11 26 11 s26 -4 26 -11" pathLength={100} />
    </svg>
  );
}
