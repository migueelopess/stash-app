"use client";

import { useRef } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TooltipGrafico } from "./tooltip-grafico";

/**
 * Gráfico do saldo com "scrubbing" contínuo (estilo apps de bolsa):
 * arrastar o dedo pela linha mostra data + valor de cada ponto e, uma vez
 * a segurar, continua a seguir mesmo que o dedo saia do gráfico — só pára
 * ao levantar. O gesto é capturado no documento e reencaminhado ao
 * Recharts como movimento do rato (x limitado às margens do gráfico).
 * Um arrasto claramente vertical deixa a página fazer scroll normalmente.
 */
export function GraficoLinha({
  dados,
}: {
  dados: { dia: string; saldo: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  const emitir = (tipo: "mousemove" | "mouseleave", clientX?: number) => {
    const el = ref.current;
    if (!el) return;
    const alvo = el.querySelector(".recharts-surface") ?? el;
    if (tipo === "mouseleave") {
      alvo.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      return;
    }
    const rect = el.getBoundingClientRect();
    const x = Math.max(rect.left + 1, Math.min(clientX ?? 0, rect.right - 1));
    const y = rect.top + rect.height / 2;
    alvo.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: x, clientY: y })
    );
  };

  const aoTocar = (e: React.TouchEvent) => {
    const inicio = e.touches[0];
    const x0 = inicio.clientX;
    const y0 = inicio.clientY;
    let decidido = false;
    let aSeguir = false;

    const mover = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!t) return;
      if (!decidido) {
        const dx = Math.abs(t.clientX - x0);
        const dy = Math.abs(t.clientY - y0);
        if (dx < 6 && dy < 6) return; // aguardar gesto claro
        decidido = true;
        aSeguir = dx >= dy; // horizontal → scrub; vertical → scroll
        if (!aSeguir) {
          limpar();
          return;
        }
      }
      if (aSeguir) {
        if (ev.cancelable) ev.preventDefault();
        emitir("mousemove", t.clientX);
      }
    };
    const fim = () => {
      limpar();
      if (aSeguir) emitir("mouseleave");
    };
    const limpar = () => {
      document.removeEventListener("touchmove", mover);
      document.removeEventListener("touchend", fim);
      document.removeEventListener("touchcancel", fim);
    };

    document.addEventListener("touchmove", mover, { passive: false });
    document.addEventListener("touchend", fim);
    document.addEventListener("touchcancel", fim);
  };

  return (
    <div ref={ref} style={{ touchAction: "pan-y" }} onTouchStart={aoTocar}>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart
          accessibilityLayer={false}
          data={dados}
          margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="saldoGradiente" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            minTickGap={40}
            dy={6}
            stroke="var(--muted-foreground)"
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            content={<TooltipGrafico />}
            isAnimationActive={false}
            cursor={{
              stroke: "#10b981",
              strokeWidth: 1.5,
              strokeDasharray: "4 4",
              strokeOpacity: 0.7,
            }}
          />
          <Area
            type="monotone"
            dataKey="saldo"
            name="Saldo"
            stroke="#10b981"
            strokeWidth={2.5}
            fill="url(#saldoGradiente)"
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 3,
              stroke: "var(--card)",
              fill: "#10b981",
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
