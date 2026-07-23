"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  name: string | null;
  iban: string | null;
}

const TIPOS = [
  { v: "", label: "Tudo" },
  { v: "ganhos", label: "Ganhos" },
  { v: "gastos", label: "Gastos" },
  { v: "movimentos", label: "Movimentos" },
];

/**
 * Topo das transações. Recolhido: lupa redonda + pills de tipo (e conta, se
 * houver várias). Ao tocar na lupa, aparece a barra de pesquisa a toda a
 * largura, com cross-fade suave. A pesquisa tem debounce e escreve ?q= no URL.
 *
 * Os dois estados são camadas sobrepostas (`inset-0`) que trocam por
 * opacidade — fiável, sem depender de animar larguras.
 */
export function PesquisaFiltros({ contas }: { contas: Conta[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [expandido, setExpandido] = useState(Boolean(params.get("q")));
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expandido) inputRef.current?.focus();
  }, [expandido]);
  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    []
  );

  const navegar = (mutar: (p: URLSearchParams) => void) => {
    const novos = new URLSearchParams(params.toString());
    mutar(novos);
    novos.delete("n");
    novos.delete("sync");
    novos.delete("novas");
    router.replace(`/transacoes?${novos.toString()}`);
  };

  const aplicarQ = (valor: string) =>
    navegar((p) => (valor.trim() ? p.set("q", valor.trim()) : p.delete("q")));

  const aoEscrever = (valor: string) => {
    setTexto(valor);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => aplicarQ(valor), 350);
  };

  const fechar = () => {
    setTexto("");
    if (temporizador.current) clearTimeout(temporizador.current);
    aplicarQ("");
    setExpandido(false);
  };

  const definir = (chave: string, valor: string) =>
    navegar((p) => (valor ? p.set(chave, valor) : p.delete(chave)));

  const tipo = params.get("tipo") ?? "";
  const conta = params.get("conta") ?? "";

  const pill = (ativo: boolean) =>
    cn(
      "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium shadow-sm transition-colors",
      ativo
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border/60 bg-card text-foreground"
    );

  return (
    <div className="relative h-10">
      {/* Camada recolhida: lupa + pills */}
      <div
        inert={expandido ? true : undefined}
        className={cn(
          "absolute inset-0 flex items-center gap-2 transition-opacity duration-200",
          expandido ? "pointer-events-none opacity-0" : "opacity-100 delay-100"
        )}
      >
        <button
          type="button"
          aria-label="Pesquisar"
          onClick={() => setExpandido(true)}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-sm transition-transform hover:text-foreground active:scale-90"
        >
          <Search className="size-4.5" />
        </button>
        <div className="sem-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5">
          {TIPOS.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => definir("tipo", t.v)}
              className={pill(tipo === t.v)}
            >
              {t.label}
            </button>
          ))}
          {contas.length > 1 && (
            <select
              aria-label="Conta"
              value={conta}
              onChange={(e) => definir("conta", e.target.value)}
              className={pill(conta !== "")}
            >
              <option value="">Todas as contas</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.iban ?? "Conta"}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Camada expandida: barra de pesquisa */}
      <div
        inert={expandido ? undefined : true}
        className={cn(
          "absolute inset-0 flex items-center rounded-full border border-border/60 bg-card shadow-sm transition-opacity duration-200",
          expandido ? "opacity-100 delay-100" : "pointer-events-none opacity-0"
        )}
      >
        <Search className="ml-3.5 size-4.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="search"
          value={texto}
          onChange={(e) => aoEscrever(e.target.value)}
          placeholder="Pesquisar transações…"
          aria-label="Pesquisar transações"
          tabIndex={expandido ? 0 : -1}
          className="h-full min-w-0 flex-1 appearance-none bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          aria-label="Fechar pesquisa"
          onClick={fechar}
          className="mr-2.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
