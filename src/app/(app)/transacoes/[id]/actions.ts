"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  regraCorresponde,
  type RegraCategorizacao,
} from "@/lib/categorizacao";
import { createClient } from "@/lib/supabase/server";

export async function categorizarTransacao(formData: FormData) {
  const transacaoId = formData.get("transacao_id") as string;
  const categoriaId = (formData.get("category_id") as string) || null;
  const criarRegra = formData.get("criar_regra") === "on";
  const matchField = formData.get("match_field") as string;
  const matchValue = ((formData.get("match_value") as string) ?? "").trim();
  const aplicarPendentes = formData.get("aplicar_pendentes") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Categorizar a transação (RLS garante que é do utilizador)
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

  // Criar regra a partir desta transação (aprende com o uso)
  if (criarRegra && categoriaId && matchValue) {
    const campo = matchField === "description" ? "description" : "counterparty";
    const { data: regra, error: erroRegra } = await supabase
      .from("categorization_rules")
      .insert({
        user_id: user.id,
        match_field: campo,
        match_type: "contains",
        match_value: matchValue,
        category_id: categoriaId,
      })
      .select("id, priority, match_field, match_type, match_value, category_id")
      .single();

    if (erroRegra) {
      console.error("Erro ao criar regra:", erroRegra);
      redirect(`/transacoes/${transacaoId}?erro=regra`);
    }

    // Aplicar já às transações por categorizar que correspondam
    if (aplicarPendentes && regra) {
      const { data: pendentes } = await supabase
        .from("transactions")
        .select("id, description, counterparty, amount")
        .is("category_id", null);

      const alvo = (pendentes ?? []).filter((t) =>
        regraCorresponde(regra as RegraCategorizacao, t)
      );

      if (alvo.length > 0) {
        await supabase
          .from("transactions")
          .update({ category_id: categoriaId, categorized_by: "rule" })
          .in(
            "id",
            alvo.map((t) => t.id)
          );
      }
    }
  }

  revalidatePath("/", "layout");
  redirect("/transacoes?categorizada=1");
}
