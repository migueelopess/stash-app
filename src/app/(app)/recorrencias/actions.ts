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
  // Esconder e confirmar são opostos — nunca coexistem
  await supabase
    .from("recurring_confirmations")
    .delete()
    .eq("user_id", user.id)
    .eq("chave", chave);

  revalidatePath("/", "layout");
  redirect("/recorrencias");
}

export async function confirmarRecorrencia(formData: FormData) {
  const chave = ((formData.get("chave") as string) ?? "").trim();
  const voltar = (formData.get("voltar") as string) || "/recorrencias";
  if (!chave) redirect("/recorrencias");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("recurring_confirmations")
    .upsert({ user_id: user.id, chave }, { onConflict: "user_id,chave" });
  // Confirmar remove qualquer exclusão anterior
  await supabase
    .from("recurring_exclusions")
    .delete()
    .eq("user_id", user.id)
    .eq("chave", chave);

  revalidatePath("/", "layout");
  redirect(voltar);
}

export async function restaurarRecorrencia(formData: FormData) {
  const chave = formData.get("chave") as string;
  const supabase = await createClient();
  await supabase.from("recurring_exclusions").delete().eq("chave", chave);
  revalidatePath("/", "layout");
  redirect("/recorrencias");
}

export async function criarRecorrenciaManual(formData: FormData) {
  const name = ((formData.get("name") as string) ?? "").trim();
  const amount = Number(formData.get("amount"));
  const cadence = formData.get("cadence") as string;
  const categoryId = (formData.get("category_id") as string) || null;
  const nextDate = (formData.get("next_date") as string) || null;

  if (
    !name ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !["weekly", "monthly", "yearly"].includes(cadence)
  ) {
    redirect("/recorrencias?erro=dados");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("recurring_manual").insert({
    user_id: user.id,
    name,
    amount: amount.toFixed(2),
    cadence,
    category_id: categoryId,
    next_date: nextDate,
  });

  if (error) {
    console.error("Erro ao criar gasto fixo:", error);
    redirect("/recorrencias?erro=criar");
  }

  revalidatePath("/", "layout");
  redirect("/recorrencias");
}

export async function apagarRecorrenciaManual(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("recurring_manual").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/recorrencias");
}
