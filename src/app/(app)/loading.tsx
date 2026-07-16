import {
  Esqueleto,
  EsqueletoCartaoLista,
  EsqueletoPagina,
} from "@/components/esqueleto";

/** Skeleton do dashboard: espelha o hero verde, o safe-to-spend e os cartões. */
export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-6 w-40 rounded-lg bg-muted" />
        </div>
        <div className="size-10 rounded-full bg-muted" />
      </div>

      {/* Hero do saldo */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 shadow-lg shadow-emerald-900/20">
        <div className="h-3.5 w-20 rounded bg-white/25" />
        <div className="mt-2 h-9 w-44 rounded-lg bg-white/30" />
        <div className="mt-3 h-6 w-36 rounded-full bg-white/15" />
        <div className="mt-4 h-10 rounded-lg bg-white/10" />
      </div>

      {/* Safe-to-spend */}
      <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="mt-2 h-8 w-36 rounded-lg bg-muted" />
        <div className="mt-2 h-3 w-52 rounded bg-muted" />
      </div>

      <EsqueletoCartaoLista linhas={3} />
      <Esqueleto className="h-40 rounded-3xl" />
    </EsqueletoPagina>
  );
}
