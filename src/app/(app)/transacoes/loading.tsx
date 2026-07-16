import {
  EsqueletoLinha,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center justify-between pt-1">
        <EsqueletoTitulo className="w-36" />
        <div className="size-9 rounded-full bg-muted" />
      </div>
      {/* Pesquisa */}
      <div className="h-10 rounded-xl bg-muted" />
      {/* Chips de filtros */}
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-full bg-muted" />
        <div className="h-8 w-20 rounded-full bg-muted" />
        <div className="h-8 w-20 rounded-full bg-muted" />
      </div>
      {/* Grupos por dia */}
      {[4, 3, 2].map((n, g) => (
        <div key={g} className="flex flex-col gap-3">
          <div className="h-3.5 w-32 rounded bg-muted" />
          <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
            {Array.from({ length: n }).map((_, i) => (
              <EsqueletoLinha key={i} />
            ))}
          </div>
        </div>
      ))}
    </EsqueletoPagina>
  );
}
