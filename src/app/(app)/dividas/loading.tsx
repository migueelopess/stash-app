import {
  Esqueleto,
  EsqueletoCartaoLista,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center justify-between pt-1">
        <EsqueletoTitulo className="w-28" />
        <div className="size-9 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Esqueleto className="h-20" />
        <Esqueleto className="h-20" />
      </div>
      <EsqueletoCartaoLista linhas={4} />
    </EsqueletoPagina>
  );
}
