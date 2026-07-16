import {
  Esqueleto,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center gap-3 pt-1">
        <div className="size-9 rounded-full bg-muted" />
        <EsqueletoTitulo className="w-28" />
      </div>
      <Esqueleto className="h-28 rounded-3xl" />
      <Esqueleto className="h-11" />
    </EsqueletoPagina>
  );
}
