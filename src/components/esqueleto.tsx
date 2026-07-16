import { cn } from "@/lib/utils";

/** Bloco cinzento genérico de skeleton (a página-mãe já pulsa). */
export function Esqueleto({ className }: { className?: string }) {
  return <div className={cn("rounded-2xl bg-muted", className)} />;
}

/** Wrapper de página em loading: pulsa e entra com fade. */
export function EsqueletoPagina({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex animate-pulse flex-col gap-4 pt-1 animate-in fade-in-0 duration-300",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Linha de lista (ícone redondo + duas linhas + valor à direita). */
export function EsqueletoLinha() {
  return (
    <div className="flex items-center gap-3">
      <div className="size-10 shrink-0 rounded-full bg-muted" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="h-3.5 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
      <div className="h-4 w-14 shrink-0 rounded bg-muted" />
    </div>
  );
}

/** Cartão com título e n linhas de lista. */
export function EsqueletoCartaoLista({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
      <div className="h-4 w-28 rounded bg-muted" />
      {Array.from({ length: linhas }).map((_, i) => (
        <EsqueletoLinha key={i} />
      ))}
    </div>
  );
}

/** Título de página (h1). */
export function EsqueletoTitulo({ className }: { className?: string }) {
  return <div className={cn("h-7 w-40 rounded-lg bg-muted", className)} />;
}
