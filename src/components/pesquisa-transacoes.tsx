"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

/** Campo de pesquisa com debounce — atualiza o parâmetro ?q= do URL. */
export function PesquisaTransacoes() {
  const router = useRouter();
  const params = useSearchParams();
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aplicar = (valor: string) => {
    const novos = new URLSearchParams(params.toString());
    if (valor.trim()) novos.set("q", valor.trim());
    else novos.delete("q");
    novos.delete("n");
    novos.delete("sync");
    novos.delete("novas");
    router.replace(`/transacoes?${novos.toString()}`);
  };

  const aoEscrever = (valor: string) => {
    setTexto(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aplicar(valor), 350);
  };

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={texto}
        onChange={(e) => aoEscrever(e.target.value)}
        placeholder="Pesquisar transações…"
        aria-label="Pesquisar transações"
        className="h-10 w-full appearance-none rounded-full border border-border/60 bg-card pl-10 pr-9 text-sm shadow-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {texto && (
        <button
          type="button"
          aria-label="Limpar pesquisa"
          onClick={() => {
            setTexto("");
            if (temporizador.current) clearTimeout(temporizador.current);
            aplicar("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
