"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Bottom-sheet controlado pelo URL: `aberto` vem do searchParam lido no
 * servidor. Fechar (X, backdrop, Esc) ou o redirect da Server Action
 * navegam para `voltarUrl`, desmontando o modal.
 */
export function ModalSheet({
  aberto,
  titulo,
  voltarUrl,
  children,
}: {
  aberto: boolean;
  titulo: string;
  voltarUrl: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!aberto) return;
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(voltarUrl, { scroll: false });
    };
    document.addEventListener("keydown", fechar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fechar);
      document.body.style.overflow = "";
    };
  }, [aberto, router, voltarUrl]);

  if (!aberto) return null;

  const fechar = () => router.push(voltarUrl, { scroll: false });

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        aria-label="Fechar"
        onClick={fechar}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-in slide-in-from-bottom-8 duration-300 sm:rounded-3xl sm:pb-5">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button
            aria-label="Fechar"
            onClick={fechar}
            className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
