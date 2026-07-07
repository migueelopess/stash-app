"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function apagarRegra(formData: FormData) {
  const regraId = formData.get("regra_id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("categorization_rules")
    .delete()
    .eq("id", regraId);

  if (error) {
    console.error("Erro ao apagar regra:", error);
    redirect("/definicoes/regras?erro=1");
  }

  revalidatePath("/definicoes/regras");
  redirect("/definicoes/regras");
}
