"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Atualiza nome e cor do avatar (guardados no user_metadata). */
export async function atualizarPerfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nome = (formData.get("nome") as string | null)?.trim().slice(0, 60);
  const cor = (formData.get("cor") as string | null)?.trim();

  const dados: Record<string, string | null> = {
    display_name: nome || null,
  };
  if (cor && /^#[0-9a-fA-F]{6}$/.test(cor)) dados.avatar_color = cor;

  const { error } = await supabase.auth.updateUser({ data: dados });
  if (error) {
    console.error("Erro ao atualizar perfil:", error);
    redirect("/definicoes?erro=perfil");
  }
  revalidatePath("/", "layout");
  redirect("/definicoes?ok=perfil");
}

/** Guarda o URL da foto de perfil já carregada no storage. */
export async function definirAvatar(url: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: url || null },
  });
  if (error) {
    console.error("Erro ao definir avatar:", error);
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Remove a foto de perfil (volta às iniciais). */
export async function removerAvatar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase.storage
    .from("avatars")
    .remove([`${user.id}/avatar.webp`]);
  await supabase.auth.updateUser({ data: { avatar_url: null } });
  revalidatePath("/", "layout");
  return { ok: true };
}

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
