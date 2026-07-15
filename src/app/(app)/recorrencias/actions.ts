"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function excluirRecorrencia(formData: FormData) {
  const chave = ((formData.get("chave") as string) ?? "").trim();
  if (!chave) redirect("/recorrencias");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("recurring_exclusions")
    .upsert({ user_id: user.id, chave }, { onConflict: "user_id,chave" });

  revalidatePath("/", "layout");
  redirect("/recorrencias");
}

export async function restaurarRecorrencia(formData: FormData) {
  const chave = formData.get("chave") as string;
  const supabase = await createClient();
  await supabase.from("recurring_exclusions").delete().eq("chave", chave);
  revalidatePath("/", "layout");
  redirect("/recorrencias");
}
