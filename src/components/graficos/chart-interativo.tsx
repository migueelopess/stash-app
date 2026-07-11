"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Envolve um gráfico Recharts com tooltip por clique e fecha-a ao tocar
 * fora ou após 4 segundos (remontar o gráfico limpa a tooltip).
 *
 * Importante: só reage a toques fora quando uma tooltip foi mesmo aberta
 * (toque no gráfico). Sem isso, cada toque em qualquer ponto da página
 * remontava os gráficos todos a meio do gesto — o layout mexia-se sob o
 * dedo e o browser cancelava o toque (botões a precisar de vários cliques
 * em mobile).
 */
export function ChartInterativo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const aberto = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fechar = () => {
      if (!aberto.current) return;
      aberto.current = false;
      if (timer.current) clearTimeout(timer.current);
      setN((v) => v + 1); // remontar fecha a tooltip
    };

    const foraDoGrafico = (e: Event) => {
      if (!aberto.current) return; // nada aberto → nada a fazer
      if (ref.current && !ref.current.contains(e.target as Node)) fechar();
    };

    document.addEventListener("pointerdown", foraDoGrafico, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", foraDoGrafico);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const aoTocarNoGrafico = () => {
    aberto.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!aberto.current) return;
      aberto.current = false;
      setN((v) => v + 1);
    }, 4000);
  };

  return (
    <div ref={ref} className={className} onPointerDown={aoTocarNoGrafico}>
      <div key={n}>{children}</div>
    </div>
  );
}
