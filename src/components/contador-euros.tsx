"use client";

import { useEffect, useState } from "react";

const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

/** Número que conta de 0 até ao valor quando aparece (com easing suave). */
export function ContadorEuros({
  valor,
  className,
}: {
  valor: number;
  className?: string;
}) {
  const [atual, setAtual] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAtual(valor);
      return;
    }
    const inicio = performance.now();
    const duracao = 900;
    let raf: number;
    const passo = (t: number) => {
      const progresso = Math.min((t - inicio) / duracao, 1);
      const easing = 1 - Math.pow(1 - progresso, 3); // ease-out cúbico
      setAtual(valor * easing);
      if (progresso < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);

  return <span className={className}>{euros.format(atual)}</span>;
}
