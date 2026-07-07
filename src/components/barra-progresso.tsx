import { cn } from "@/lib/utils";

export function BarraProgresso({
  percentagem,
  className,
}: {
  percentagem: number; // 0-100
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
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${limitada}%` }}
      />
    </div>
  );
}
