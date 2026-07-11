"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Gauge,
  Landmark,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/orcamentos", label: "Orçamentos", icon: Gauge },
  { href: "/contas", label: "Contas", icon: Landmark },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = items.findIndex((it) =>
    it.href === "/" ? pathname === "/" : pathname.startsWith(it.href)
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/60 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
      <div className="relative mx-auto grid max-w-lg grid-cols-5">
        {/* indicador "glass" que desliza para o separador ativo */}
        {activeIndex >= 0 && (
          <div
            className="pointer-events-none absolute top-1.5 left-0 h-10 w-1/5 px-3 transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          >
            <div className="h-full w-full rounded-2xl bg-primary/12 ring-1 ring-inset ring-primary/25 shadow-sm shadow-primary/10 backdrop-blur" />
          </div>
        )}
        {items.map(({ href, label, icon: Icon }, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex items-center justify-center py-3.5 transition-colors duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-[22px] transition-transform duration-300",
                  active && "-translate-y-0.5 scale-110"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
