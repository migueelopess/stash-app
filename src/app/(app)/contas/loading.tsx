import {
  Esqueleto,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <EsqueletoTitulo className="w-28" />
      <Esqueleto className="h-28 rounded-3xl" />
      <Esqueleto className="h-28 rounded-3xl" />
      <Esqueleto className="h-11" />
    </EsqueletoPagina>
  );
}
