"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarCategoria(formData: FormData) {
  const nome = ((formData.get("name") as string) ?? "").trim();
  const kind = formData.get("kind") as string;

  if (!nome || !["income", "expense"].includes(kind)) {
    redirect("/definicoes/categorias?erro=dados");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name: nome,
    kind,
  });

  if (error) {
    console.error("Erro ao criar categoria:", error);
    redirect("/definicoes/categorias?erro=criar");
  }

  revalidatePath("/definicoes/categorias");
  redirect("/definicoes/categorias");
}

export async function apagarCategoria(formData: FormData) {
  const categoriaId = formData.get("categoria_id") as string;
  const supabase = await createClient();

  // Só as categorias do próprio utilizador são apagáveis (RLS);
  // falha também se estiver em uso por transações/regras (FK)
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoriaId);

  if (error) {
    console.error("Erro ao apagar categoria:", error);
    redirect("/definicoes/categorias?erro=apagar");
  }

  revalidatePath("/definicoes/categorias");
  redirect("/definicoes/categorias");
}
