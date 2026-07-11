"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarCategoria(formData: FormData) {
  const nome = ((formData.get("name") as string) ?? "").trim();
  const kind = formData.get("kind") as string;
  const cor = ((formData.get("color") as string) ?? "").trim() || null;

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
    color: cor,
    icon: kind === "income" ? "circle-plus" : "circle-ellipsis",
  });

  if (error) {
    console.error("Erro ao criar categoria:", error);
    redirect("/definicoes/categorias?erro=criar");
  }

  revalidatePath("/", "layout");
  redirect("/definicoes/categorias");
}

export async function definirCorCategoria(formData: FormData) {
  const categoriaId = formData.get("categoria_id") as string;
  const cor = ((formData.get("color") as string) ?? "").trim();
  if (!categoriaId || !/^#[0-9a-fA-F]{6}$/.test(cor)) {
    redirect("/definicoes/categorias?erro=cor");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("category_colors").upsert(
    { user_id: user.id, category_id: categoriaId, color: cor },
    { onConflict: "user_id,category_id" }
  );

  if (error) {
    console.error("Erro ao definir cor:", error);
    redirect("/definicoes/categorias?erro=cor");
  }

  revalidatePath("/", "layout");
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
