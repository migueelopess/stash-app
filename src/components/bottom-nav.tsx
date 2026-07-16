"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartColumn,
  Gauge,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/analise", label: "Análise", icon: ChartColumn },
  { href: "/orcamentos", label: "Orçamentos", icon: Gauge },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = items.findIndex((it) =>
    it.href === "/" ? pathname === "/" : pathname.startsWith(it.href)
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* cápsula flutuante fosca (estilo Revolut) */}
      <nav className="pointer-events-auto relative grid w-full max-w-sm grid-cols-5 rounded-[1.75rem] border border-border/50 bg-background/65 p-1.5 shadow-xl shadow-black/15 backdrop-blur-2xl">
        {/* pílula ativa que desliza à volta do ícone+label */}
        {activeIndex >= 0 && (
          <div
            className="pointer-events-none absolute top-1.5 bottom-1.5 left-1.5 w-[calc((100%-0.75rem)/5)] rounded-3xl bg-primary/15 ring-1 ring-inset ring-primary/25 transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.3,0.64,1)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
        )}
        {items.map(({ href, label, icon: Icon }, i) => {
          const active = i === activeIndex;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex flex-col items-center gap-1 rounded-3xl py-2 text-[10px] font-medium transition-colors duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-[21px]" strokeWidth={active ? 2.5 : 2} />
              <span className="whitespace-nowrap leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
