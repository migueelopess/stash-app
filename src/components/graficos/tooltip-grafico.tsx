"use client";

const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

interface Ponto {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
}

interface Props {
  active?: boolean;
  payload?: Ponto[];
  label?: string | number;
}

/** Tooltip minimalista partilhado pelos gráficos: pílula escura flutuante. */
export function TooltipGrafico({ active, payload, label }: Props) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-foreground/95 px-3 py-1.5 text-xs font-semibold text-background shadow-lg backdrop-blur">
      {label !== undefined && label !== "" && (
        <span className="capitalize opacity-60">{label}</span>
      )}
      {payload.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: p.color ?? p.fill ?? "currentColor" }}
          />
          {euros.format(Number(p.value ?? 0))}
        </span>
      ))}
    </div>
  );
}
