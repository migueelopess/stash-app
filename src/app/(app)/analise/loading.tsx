import {
  Esqueleto,
  EsqueletoCartaoLista,
  EsqueletoPagina,
  EsqueletoTitulo,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <EsqueletoTitulo className="w-28" />
      {/* Controlo gastos/ganhos + seletor de mês */}
      <div className="h-10 rounded-xl bg-muted" />
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-full bg-muted" />
        <div className="h-8 w-24 rounded-full bg-muted" />
        <div className="h-8 w-24 rounded-full bg-muted" />
      </div>
      {/* Hero comparativo */}
      <Esqueleto className="h-32 rounded-3xl" />
      {/* Fila de estatísticas */}
      <div className="grid grid-cols-3 gap-2">
        <Esqueleto className="h-20" />
        <Esqueleto className="h-20" />
        <Esqueleto className="h-20" />
      </div>
      <EsqueletoCartaoLista linhas={4} />
      <Esqueleto className="h-36 rounded-3xl" />
    </EsqueletoPagina>
  );
}
