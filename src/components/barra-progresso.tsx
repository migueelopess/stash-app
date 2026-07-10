import { cn } from "@/lib/utils";

export function BarraProgresso({
  percentagem,
  cor,
  className,
}: {
  percentagem: number; // 0-100
  cor?: string; // cor da barra (por omissão esmeralda)
  className?: string;
}) {
  const limitada = Math.max(0, Math.min(100, percentagem));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(limitada)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all", !cor && "bg-emerald-500")}
        style={{ width: `${limitada}%`, backgroundColor: cor }}
      />
    </div>
  );
}
