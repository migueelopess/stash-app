import {
  Esqueleto,
  EsqueletoCartaoLista,
  EsqueletoPagina,
} from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center gap-3 pt-1">
        <div className="size-9 rounded-full bg-muted" />
        <div className="flex flex-col gap-1.5">
          <div className="h-6 w-40 rounded-lg bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
      <Esqueleto className="h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-2">
        <Esqueleto className="h-20" />
        <Esqueleto className="h-20" />
      </div>
      <EsqueletoCartaoLista linhas={5} />
    </EsqueletoPagina>
  );
}
