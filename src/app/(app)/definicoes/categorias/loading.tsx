import {
  EsqueletoCartaoLista,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center gap-3 pt-1">
        <div className="size-9 rounded-full bg-muted" />
        <EsqueletoTitulo className="w-36" />
      </div>
      <EsqueletoCartaoLista linhas={6} />
    </EsqueletoPagina>
  );
}
