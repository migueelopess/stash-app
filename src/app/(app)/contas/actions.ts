"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { iniciarAutorizacao } from "@/lib/enablebanking/client";
import { createClient } from "@/lib/supabase/server";

// Máximo PSD2 são 180 dias exatos; pedimos menos 1h de margem para
// desvios de relógio entre o cliente e a Enable Banking (senão: 422).
const VALIDADE_MS = 180 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000;

export async function ligarBanco(formData: FormData) {
  const aspspName = formData.get("aspsp_name") as string;
  const aspspCountry = formData.get("aspsp_country") as string;

  if (!aspspName || !aspspCountry) {
    redirect("/contas?erro=banco_invalido");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const state = randomUUID();
  const validUntil = new Date(Date.now() + VALIDADE_MS).toISOString();

  let urlBanco: string;
  try {
    const { url } = await iniciarAutorizacao({
      aspspName,
      aspspCountry,
      state,
      validUntil,
    });
    urlBanco = url;
  } catch (e) {
    console.error("Erro ao iniciar autorização Enable Banking:", e);
    redirect("/contas?erro=autorizacao");
  }

  // Guardar o pedido pendente para validar no callback (anti-CSRF)
  const cookieStore = await cookies();
  cookieStore.set(
    "eb_pending",
    JSON.stringify({ state, name: aspspName, country: aspspCountry }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10 minutos para completar a autorização no banco
      path: "/",
    }
  );

  redirect(urlBanco);
}
