"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function criarOrcamento(formData: FormData) {
  const categoriaId = (formData.get("category_id") as string) || null; // "" = global
  const valor = Number(formData.get("amount"));
  const period = formData.get("period") as string;

  if (!Number.isFinite(valor) || valor <= 0 || !["weekly", "monthly", "yearly"].includes(period)) {
    redirect("/orcamentos?erro=dados");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const agora = new Date();
  const { error } = await supabase.from("budgets").insert({
    user_id: user.id,
    category_id: categoriaId === "global" ? null : categoriaId,
    amount: valor.toFixed(2),
    period,
    // Ancorar a janela ao dia de criação (semana/mês/ano rolam a partir daqui)
    start_date: agora.toISOString().slice(0, 10),
    // Instante exato: só conta o que entrar na app a partir daqui
    start_at: agora.toISOString(),
  });

  if (error) {
    console.error("Erro ao criar orçamento:", error);
    redirect(
      error.code === "23505"
        ? "/orcamentos?erro=duplicado"
        : "/orcamentos?erro=criar"
    );
  }

  revalidatePath("/", "layout");
  redirect("/orcamentos");
}

export async function atualizarOrcamento(formData: FormData) {
  const orcamentoId = formData.get("orcamento_id") as string;
  const valor = Number(formData.get("amount"));
  const period = formData.get("period") as string;

  if (!Number.isFinite(valor) || valor <= 0 || !["weekly", "monthly", "yearly"].includes(period)) {
    redirect(`/orcamentos/${orcamentoId}?erro=dados`);
  }

  const supabase = await createClient();

  // Se o período mudar, reancorar a janela ao dia de hoje
  const { data: atual } = await supabase
    .from("budgets")
    .select("period")
    .eq("id", orcamentoId)
    .maybeSingle();
  const mudouPeriodo = atual?.period !== period;
  const agora = new Date();

  const { error } = await supabase
    .from("budgets")
    .update({
      amount: valor.toFixed(2),
      period,
      // limite mudou → os limiares de alerta recomeçam
      alert_level: 0,
      // período novo → janela reancorada e a contar do zero a partir de agora
      ...(mudouPeriodo
        ? {
            start_date: agora.toISOString().slice(0, 10),
            start_at: agora.toISOString(),
          }
        : {}),
    })
    .eq("id", orcamentoId);

  if (error) {
    console.error("Erro ao atualizar orçamento:", error);
    redirect(`/orcamentos/${orcamentoId}?erro=guardar`);
  }

  revalidatePath("/", "layout");
  redirect("/orcamentos");
}

export async function apagarOrcamento(formData: FormData) {
  const orcamentoId = formData.get("orcamento_id") as string;
  const supabase = await createClient();

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", orcamentoId);

  if (error) {
    console.error("Erro ao apagar orçamento:", error);
    redirect(`/orcamentos/${orcamentoId}?erro=apagar`);
  }

  revalidatePath("/", "layout");
  redirect("/orcamentos");
}
