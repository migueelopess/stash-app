"use client";

import { useEffect, useState } from "react";
import { LogoStash } from "@/components/logo-stash";
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
 * Splash de arranque da Stash: fundo navy, o S néon desenha-se traço a
 * traço com glow pulsante. Vem no HTML inicial (server-rendered), por isso
 * aparece assim que o primeiro byte chega — cobre o load real da app.
 * Mostra-se uma vez por sessão do browser e sai com fade.
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
    // Depois da hidratação, deixa o desenho acabar e sai suave.
    const t1 = setTimeout(() => setFase("saida"), 1000);
    const t2 = setTimeout(() => setFase("removido"), 1500);
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
          "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-[#0b1220] transition-opacity duration-500",
          fase === "saida" && "pointer-events-none opacity-0"
        )}
      >
        {/* halo néon suave por trás da marca */}
        <div className="relative">
          <div className="absolute -inset-10 rounded-full bg-teal-300/10 blur-2xl" />
          <LogoStash
            animado
            className="relative size-32 text-[#61E5C3] animate-[stash-neon_2.2s_ease-in-out_infinite]"
          />
        </div>

        <div className="flex flex-col items-center gap-2 animate-[splash-subir_0.7s_ease-out_0.5s_both]">
          <p className="text-3xl font-extrabold tracking-tight text-white">
            Stash
          </p>
          <p className="text-sm text-teal-100/60">{frase}</p>
        </div>

        {/* Pontinhos */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-teal-200 animate-[splash-ponto_1.2s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: scriptSkip }} />
    </>
  );
}
