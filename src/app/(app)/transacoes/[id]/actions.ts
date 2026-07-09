"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  regraAprendida,
  regraCorresponde,
  type RegraCategorizacao,
} from "@/lib/categorizacao";
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

  // Aprender: guardar (ou atualizar) a regra desta transação e aplicá-la
  // às pendentes e às que a própria app tinha categorizado antes.
  if (categoriaId) {
    const aprendida = regraAprendida(
      transacao.description,
      transacao.counterparty
    );

    if (aprendida) {
      const { data: existente } = await supabase
        .from("categorization_rules")
        .select("id, category_id")
        .eq("match_field", aprendida.match_field)
        .eq("match_value", aprendida.match_value)
        .maybeSingle();

      let regraId = existente?.id;
      if (existente && existente.category_id !== categoriaId) {
        // O utilizador corrigiu — a regra reaprende
        await supabase
          .from("categorization_rules")
          .update({ category_id: categoriaId })
          .eq("id", existente.id);
      } else if (!existente) {
        const { data: nova, error: erroRegra } = await supabase
          .from("categorization_rules")
          .insert({ user_id: user.id, ...aprendida, category_id: categoriaId })
          .select("id")
          .single();
        if (erroRegra) {
          console.error("Erro ao guardar aprendizagem:", erroRegra);
        }
        regraId = nova?.id;
      }

      if (regraId) {
        // Aplicar a quem está pendente ou foi categorizado por regra
        const regra: RegraCategorizacao = {
          id: regraId,
          priority: 100,
          category_id: categoriaId,
          ...aprendida,
        };
        const { data: candidatas } = await supabase
          .from("transactions")
          .select("id, description, counterparty, amount, category_id")
          .or(
            "categorized_by.eq.none,categorized_by.eq.rule,categorized_by.eq.dict"
          )
          .neq("id", transacaoId);

        const alvo = (candidatas ?? []).filter(
          (t) => t.category_id !== categoriaId && regraCorresponde(regra, t)
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
  }

  revalidatePath("/", "layout");
  redirect("/transacoes?categorizada=1");
}
