"use client";

import { useEffect, useRef, useState } from "react";

/** Paletas de cor por "vibe" (3 blobs cada). Escolhido no perfil. */
const VIBES: Record<string, [string, string, string]> = {
  aurora: ["#10b981", "#0d9488", "#8b5cf6"],
  oceano: ["#06b6d4", "#3b82f6", "#6366f1"],
  porsol: ["#fb923c", "#ec4899", "#a855f7"],
  floresta: ["#22c55e", "#84cc16", "#0d9488"],
};

/**
 * Fundo "aurora": blobs de cor suaves, fixos atrás do conteúdo, que derivam
 * devagar e reagem ao scroll (parallax). A vibe vem do localStorage ("fundo")
 * e atualiza ao vivo quando muda no perfil. "off" desliga.
 */
export function FundoAnimado() {
  const ref = useRef<HTMLDivElement>(null);
  const [vibe, setVibe] = useState<string | null>(null);

  useEffect(() => {
    const ler = () => {
      try {
        setVibe(localStorage.getItem("fundo") || "aurora");
      } catch {
        setVibe("aurora");
      }
    };
    ler();
    window.addEventListener("fundo-mudou", ler);
    return () => window.removeEventListener("fundo-mudou", ler);
  }, []);

  useEffect(() => {
    if (!vibe || vibe === "off") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const aoScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        ref.current?.style.setProperty("--scroll", String(window.scrollY));
      });
    };
    window.addEventListener("scroll", aoScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoScroll);
      cancelAnimationFrame(raf);
    };
  }, [vibe]);

  if (!vibe || vibe === "off") return null;
  const [a, b, c] = VIBES[vibe] ?? VIBES.aurora;
  const blob = (cor: string) => ({
    background: `radial-gradient(circle at center, ${cor}, transparent 68%)`,
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className="fundo-animado pointer-events-none fixed inset-0 z-0 overflow-hidden animate-in fade-in duration-700"
    >
      <div className="fundo-blob fundo-blob-1" style={blob(a)} />
      <div className="fundo-blob fundo-blob-2" style={blob(b)} />
      <div className="fundo-blob fundo-blob-3" style={blob(c)} />
    </div>
  );
}
