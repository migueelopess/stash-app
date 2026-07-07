"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarMeta(formData: FormData) {
  const nome = ((formData.get("name") as string) ?? "").trim();
  const valorAlvo = Number(formData.get("target_amount"));
  const dataAlvo = (formData.get("target_date") as string) || null;

  if (!nome || !Number.isFinite(valorAlvo) || valorAlvo <= 0) {
    redirect("/definicoes/metas?erro=dados");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name: nome,
    target_amount: valorAlvo.toFixed(2),
    target_date: dataAlvo,
  });

  if (error) {
    console.error("Erro ao criar meta:", error);
    redirect("/definicoes/metas?erro=criar");
  }

  revalidatePath("/", "layout");
  redirect("/definicoes/metas");
}

export async function apagarMeta(formData: FormData) {
  const metaId = formData.get("meta_id") as string;
  const supabase = await createClient();

  const { error } = await supabase.from("goals").delete().eq("id", metaId);

  if (error) {
    console.error("Erro ao apagar meta:", error);
    redirect("/definicoes/metas?erro=apagar");
  }

  revalidatePath("/", "layout");
  redirect("/definicoes/metas");
}
