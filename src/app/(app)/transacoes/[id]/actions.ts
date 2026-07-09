"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aprenderEAplicar } from "@/lib/aprendizagem";
import { createClient } from "@/lib/supabase/server";

export async function categorizarTransacao(formData: FormData) {
  const transacaoId = formData.get("transacao_id") as string;
  const categoriaId = (formData.get("category_id") as string) || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Dados da transação (RLS garante que é do utilizador)
  const { data: transacao } = await supabase
    .from("transactions")
    .select("id, description, counterparty")
    .eq("id", transacaoId)
    .maybeSingle();

  if (!transacao) {
    redirect("/transacoes");
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoriaId,
      categorized_by: categoriaId ? "manual" : "none",
    })
    .eq("id", transacaoId);

  if (error) {
    console.error("Erro ao categorizar transação:", error);
    redirect(`/transacoes/${transacaoId}?erro=guardar`);
  }

  if (categoriaId) {
    await aprenderEAplicar(supabase, user.id, transacao, categoriaId, [
      transacaoId,
    ]);
  }

  revalidatePath("/", "layout");
  redirect("/transacoes?categorizada=1");
}
