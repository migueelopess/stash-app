"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPCOES = [
  { valor: "sistema", rotulo: "Sistema", icon: Monitor },
  { valor: "claro", rotulo: "Claro", icon: Sun },
  { valor: "escuro", rotulo: "Escuro", icon: Moon },
];

declare global {
  interface Window {
    __aplicarTema?: () => void;
  }
}

export function SeletorTema() {
  const [tema, setTema] = useState("sistema");

  useEffect(() => {
    try {
      setTema(localStorage.getItem("tema") || "sistema");
    } catch {
      // localStorage indisponível — mantém "sistema"
    }
  }, []);

  const escolher = (valor: string) => {
    setTema(valor);
    try {
      localStorage.setItem("tema", valor);
    } catch {
      // ignora
    }
    window.__aplicarTema?.();
  };

  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-muted p-1">
      {OPCOES.map(({ valor, rotulo, icon: Icon }) => (
        <button
          key={valor}
          type="button"
          onClick={() => escolher(valor)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all",
            tema === valor
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-4" />
          {rotulo}
        </button>
      ))}
    </div>
  );
}
