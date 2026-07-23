// Classes partilhadas entre server e client components. Fica num módulo
// simples (sem "use client") para o valor poder ser usado no servidor —
// constantes exportadas de módulos client tornam-se referências e não o
// próprio valor quando lidas num Server Component.

/** "Tile" de ação: ícone em cima, rótulo pequeno em baixo. */
export const TILE_ACAO =
  "flex flex-1 basis-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-card p-3 text-[11px] font-medium shadow-sm transition-all hover:bg-muted/50 active:scale-95";
