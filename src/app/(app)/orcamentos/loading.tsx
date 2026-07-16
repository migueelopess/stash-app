import { EsqueletoPagina, EsqueletoTitulo } from "@/components/esqueleto";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div className="flex items-center justify-between pt-1">
        <EsqueletoTitulo className="w-36" />
        <div className="size-9 rounded-full bg-muted" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-muted" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div className="h-3.5 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
          <div className="h-2 rounded-full bg-muted" />
        </div>
      ))}
    </EsqueletoPagina>
  );
}
