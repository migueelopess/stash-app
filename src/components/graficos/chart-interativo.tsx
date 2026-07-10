"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Envolve um gráfico Recharts com tooltip por clique e fecha-a
 * automaticamente: ao tocar fora do gráfico ou após 4 segundos.
 * (Recharts não fecha a tooltip de clique sozinho; remontar limpa-a.)
 */
export function ChartInterativo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fechar = () => {
    if (timer.current) clearTimeout(timer.current);
    setN((v) => v + 1); // remontar fecha a tooltip
  };

  useEffect(() => {
    const foraDoGrafico = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };
    document.addEventListener("pointerdown", foraDoGrafico);
    return () => {
      document.removeEventListener("pointerdown", foraDoGrafico);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const aoTocar = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fechar, 4000);
  };

  return (
    <div ref={ref} className={className} onPointerDown={aoTocar}>
      <div key={n}>{children}</div>
    </div>
  );
}
