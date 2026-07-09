"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aprenderEAplicar } from "@/lib/aprendizagem";
import { createClient } from "@/lib/supabase/server";

export async function categorizarGrupo(formData: FormData) {
  const ids = ((formData.get("ids") as string) ?? "")
    .split(",")
    .filter(Boolean);
  const categoriaId = (formData.get("category_id") as string) || null;
  const descricao = (formData.get("descricao_amostra") as string) || null;
  const contraparte = (formData.get("contraparte_amostra") as string) || null;

  if (ids.length === 0 || !categoriaId) {
    redirect("/transacoes/pendentes");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("transactions")
    .update({ category_id: categoriaId, categorized_by: "manual" })
    .in("id", ids);

  if (error) {
    console.error("Erro ao categorizar grupo:", error);
    redirect("/transacoes/pendentes?erro=1");
  }

  // Aprender com o grupo — as futuras (e outras parecidas) vão atrás
  await aprenderEAplicar(
    supabase,
    user.id,
    { description: descricao, counterparty: contraparte },
    categoriaId,
    ids
  );

  revalidatePath("/", "layout");
  redirect("/transacoes/pendentes");
}
