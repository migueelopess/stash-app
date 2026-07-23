"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const OPCOES = [
  { v: "aurora", label: "Aurora", cores: ["#10b981", "#8b5cf6"] },
  { v: "oceano", label: "Oceano", cores: ["#06b6d4", "#6366f1"] },
  { v: "porsol", label: "Pôr do sol", cores: ["#fb923c", "#ec4899"] },
  { v: "floresta", label: "Floresta", cores: ["#22c55e", "#0d9488"] },
  { v: "off", label: "Nenhum", cores: [] as string[] },
];

/** Escolhe a "vibe" do fundo animado. Guarda em localStorage e avisa o
 *  FundoAnimado (evento) para atualizar ao vivo. */
export function SeletorFundo() {
  const [vibe, setVibe] = useState("aurora");

  useEffect(() => {
    try {
      setVibe(localStorage.getItem("fundo") || "aurora");
    } catch {
      // ignora
    }
  }, []);

  const escolher = (v: string) => {
    setVibe(v);
    try {
      localStorage.setItem("fundo", v);
    } catch {
      // ignora
    }
    window.dispatchEvent(new Event("fundo-mudou"));
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {OPCOES.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => escolher(o.v)}
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl transition-transform active:scale-90",
              vibe === o.v && "ring-2 ring-primary ring-offset-2 ring-offset-card"
            )}
            style={{
              background:
                o.cores.length === 2
                  ? `linear-gradient(135deg, ${o.cores[0]}, ${o.cores[1]})`
                  : "var(--muted)",
            }}
          >
            {vibe === o.v && (
              <Check
                className={cn(
                  "size-5 drop-shadow",
                  o.v === "off" ? "text-foreground" : "text-white"
                )}
                strokeWidth={3}
              />
            )}
          </span>
          <span className="text-[11px] text-muted-foreground">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
