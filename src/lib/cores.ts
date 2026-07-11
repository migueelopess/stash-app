import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Mapa category_id → cor personalizada do utilizador (override). */
export async function carregarCoresOverride(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("category_colors")
    .select("category_id, color");
  return new Map(
    (data ?? []).map((c) => [c.category_id as string, c.color as string])
  );
}

/** Cor de uma categoria: override do utilizador, senão a cor base. */
export function corCategoria(
  overrides: Map<string, string>,
  categoryId: string | null | undefined,
  base: string | null | undefined
): string | null {
  if (categoryId && overrides.has(categoryId)) {
    return overrides.get(categoryId)!;
  }
  return base ?? null;
}
