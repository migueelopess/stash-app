import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Banknote,
  Bus,
  CircleEllipsis,
  CirclePlus,
  Gamepad2,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  Repeat,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mapa dos nomes de ícone guardados na BD (categories.icon) para componentes
const ICONES: Record<string, LucideIcon> = {
  banknote: Banknote,
  "hand-coins": HandCoins,
  "circle-plus": CirclePlus,
  "shopping-cart": ShoppingCart,
  bus: Bus,
  repeat: Repeat,
  "gamepad-2": Gamepad2,
  "graduation-cap": GraduationCap,
  "arrow-left-right": ArrowLeftRight,
  "circle-ellipsis": CircleEllipsis,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  house: House,
  scissors: Scissors,
  "trending-up": TrendingUp,
};

export function IconeCategoria({
  icone,
  cor,
  ganho,
  className,
}: {
  icone?: string | null;
  cor?: string | null;
  /** usado no fallback sem categoria: seta de entrada/saída */
  ganho?: boolean;
  className?: string;
}) {
  const Icone = icone ? ICONES[icone] : undefined;
  const IconeFinal = Icone ?? (ganho ? ArrowDownLeft : ArrowUpRight);
  const corFinal = cor ?? (Icone ? "#94a3b8" : ganho ? "#10b981" : "#94a3b8");

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full",
        className
      )}
      style={{ backgroundColor: `${corFinal}1f`, color: corFinal }}
    >
      <IconeFinal className="size-5" />
    </span>
  );
}
