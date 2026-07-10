"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function guardarSubscricaoPush(subscricao: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscricao.endpoint,
      p256dh: subscricao.keys.p256dh,
      auth: subscricao.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("Erro ao guardar subscrição push:", error);
    return { ok: false };
  }
  return { ok: true };
}

export async function removerSubscricaoPush(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}
