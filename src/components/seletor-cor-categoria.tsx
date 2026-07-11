"use client";

import { useState } from "react";
import { definirCorCategoria } from "@/app/(app)/definicoes/categorias/actions";
import { PALETA } from "@/lib/paleta";

/** Ponto de cor que abre uma paleta; escolher submete e recolore a categoria. */
export function SeletorCorCategoria({
  categoriaId,
  cor,
}: {
  categoriaId: string;
  cor: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Mudar cor"
        className="size-8 rounded-full ring-2 ring-inset ring-black/10 transition-transform active:scale-90 dark:ring-white/10"
        style={{ backgroundColor: cor }}
      />
      {aberto && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setAberto(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 top-10 z-20 flex w-[15.5rem] flex-wrap gap-2 rounded-2xl border border-border/60 bg-popover p-3 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
            {PALETA.map((c) => (
              <form key={c} action={definirCorCategoria}>
                <input type="hidden" name="categoria_id" value={categoriaId} />
                <input type="hidden" name="color" value={c} />
                <button
                  type="submit"
                  aria-label={`Cor ${c}`}
                  className="size-7 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              </form>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
