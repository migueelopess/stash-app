import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  regraAprendida,
  regraCorresponde,
  type RegraCategorizacao,
} from "@/lib/categorizacao";

/**
 * Aprende com uma transação categorizada: guarda (ou reaponta) a regra
 * derivada da descrição/contraparte e aplica-a às transações pendentes
 * ou categorizadas automaticamente (rule/dict). As manuais ficam intocadas.
 */
export async function aprenderEAplicar(
  supabase: SupabaseClient,
  userId: string,
  origem: { description: string | null; counterparty: string | null },
  categoriaId: string,
  idsJaTratados: string[] = []
): Promise<void> {
  const aprendida = regraAprendida(origem.description, origem.counterparty);
  if (!aprendida) return;

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
    const { data: nova, error } = await supabase
      .from("categorization_rules")
      .insert({ user_id: userId, ...aprendida, category_id: categoriaId })
      .select("id")
      .single();
    if (error) {
      console.error("Erro ao guardar aprendizagem:", error);
      return;
    }
    regraId = nova?.id;
  }

  if (!regraId) return;

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
    );

  const tratados = new Set(idsJaTratados);
  const alvo = (candidatas ?? []).filter(
    (t) =>
      !tratados.has(t.id) &&
      t.category_id !== categoriaId &&
      regraCorresponde(regra, t)
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
