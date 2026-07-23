import {
  Esqueleto,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <EsqueletoTitulo className="w-28" />
      {/* Avatar + nome */}
      <div className="flex flex-col items-center gap-4">
        <div className="size-24 rounded-full bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
      </div>
      <Esqueleto className="h-12" />
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-16" />
        <Esqueleto className="h-16" />
        <Esqueleto className="h-16" />
        <Esqueleto className="h-16" />
      </div>
    </EsqueletoPagina>
  );
}
