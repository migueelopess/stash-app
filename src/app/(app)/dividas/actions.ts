"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarDivida(formData: FormData) {
  const person = ((formData.get("person") as string) ?? "").trim();
  const direction = formData.get("direction") as string;
  const amount = Number(formData.get("amount"));
  const note = ((formData.get("note") as string) ?? "").trim() || null;
  const transactionId = (formData.get("transaction_id") as string) || null;

  if (
    !person ||
    !["a_receber", "a_pagar"].includes(direction) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    redirect("/dividas?erro=dados");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    person,
    direction,
    amount: amount.toFixed(2),
    note,
    transaction_id: transactionId,
  });

  if (error) {
    console.error("Erro ao criar dívida:", error);
    redirect("/dividas?erro=criar");
  }

  revalidatePath("/", "layout");
  redirect("/dividas");
}

export async function alternarSaldada(formData: FormData) {
  const id = formData.get("divida_id") as string;
  const saldar = formData.get("saldar") === "1";

  const supabase = await createClient();
  const { error } = await supabase
    .from("debts")
    .update({
      settled: saldar,
      settled_at: saldar ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar dívida:", error);
  }

  revalidatePath("/", "layout");
  redirect("/dividas");
}

export async function apagarDivida(formData: FormData) {
  const id = formData.get("divida_id") as string;
  const supabase = await createClient();
  await supabase.from("debts").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/dividas");
}
