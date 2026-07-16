"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const FRASES = [
  "A contar os cêntimos…",
  "A acordar o banco…",
  "A polir as moedas…",
  "A abanar o mealheiro…",
  "A perseguir os teus gastos…",
  "A pôr as contas em dia…",
];

// Esconde o splash antes do primeiro paint se já foi mostrado nesta sessão.
// Corre inline durante o parse do HTML — não espera pela hidratação.
const scriptSkip = `try{if(sessionStorage.getItem("splash-app")==="1"){var s=document.getElementById("splash-inicial");if(s)s.style.display="none"}}catch(e){}`;

/**
 * Splash de arranque: vem no HTML inicial (server-rendered), por isso aparece
 * assim que o primeiro byte chega — cobre o load real da app. Mostra-se uma
 * vez por sessão do browser e sai com fade.
 */
export function SplashInicial() {
  const [fase, setFase] = useState<"visivel" | "saida" | "removido">(
    "visivel"
  );
  const [frase, setFrase] = useState(FRASES[0]);

  useEffect(() => {
    let ja = false;
    try {
      ja = sessionStorage.getItem("splash-app") === "1";
    } catch {}
    if (ja) {
      setFase("removido");
      return;
    }
    try {
      sessionStorage.setItem("splash-app", "1");
    } catch {}
    setFrase(FRASES[Math.floor(Math.random() * FRASES.length)]);
    // Depois da hidratação, segura o splash mais um bocadinho e sai suave.
    const t1 = setTimeout(() => setFase("saida"), 900);
    const t2 = setTimeout(() => setFase("removido"), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (fase === "removido") return null;

  return (
    <>
      <div
        id="splash-inicial"
        suppressHydrationWarning
        aria-hidden
        className={cn(
          "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 transition-opacity duration-500",
          fase === "saida" && "pointer-events-none opacity-0"
        )}
      >
        {/* Moeda a saltar e a girar */}
        <div className="flex flex-col items-center">
          <div className="animate-[splash-salto_1.1s_ease-in-out_infinite]">
            <div
              className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-500 text-4xl font-extrabold text-amber-800 shadow-xl shadow-black/25 ring-4 ring-amber-100/50 [transform-style:preserve-3d] animate-[splash-giro_1.4s_linear_infinite]"
            >
              €
            </div>
          </div>
          <div className="mt-3 h-2 w-14 rounded-full bg-black/30 blur-[3px] animate-[splash-sombra_1.1s_ease-in-out_infinite]" />
        </div>

        <div className="flex flex-col items-center gap-2 animate-[splash-subir_0.6s_ease-out_both]">
          <p className="text-xl font-bold text-white">Gestão Financeira</p>
          <p className="text-sm text-emerald-100/90">{frase}</p>
        </div>

        {/* Pontinhos */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-white animate-[splash-ponto_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: scriptSkip }} />
    </>
  );
}
