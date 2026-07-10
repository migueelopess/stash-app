"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Véu com spinner sobre o formulário-pai enquanto a Server Action corre.
 * Para formulários sem botão visível (ex.: selects que auto-submetem).
 */
export function OverlayPendente() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-card/60 backdrop-blur-[1px]">
      <Loader2 className="size-5 animate-spin text-primary" />
    </div>
  );
}
