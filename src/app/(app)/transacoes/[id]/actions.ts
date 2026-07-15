"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aprenderEAplicar } from "@/lib/aprendizagem";
import { chaveDoNome } from "@/lib/nomes-comerciantes";
import { createClient } from "@/lib/supabase/server";

export async function categorizarTransacao(formData: FormData) {
  const transacaoId = formData.get("transacao_id") as string;
  const categoriaId = (formData.get("category_id") as string) || null;
  const nome = ((formData.get("nome") as string) ?? "").trim();
  const nomePredefinido = ((formData.get("nome_predefinido") as string) ?? "").trim();
  const nomeGlobal = ((formData.get("nome_global") as string) ?? "").trim();
  // Por defeito a app aprende (toggle ligado). Desligado = exceção pontual:
  // não aprende regra nem altera o nome do comerciante. A checkbox só chega
  // ao formulário quando está ligada, por isso a ausência = exceção.
  const apenasEsta = formData.get("lembrar") !== "on";

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

  if (apenasEsta) {
    // Exceção pontual: categoria + nome só nesta linha, sem aprender nada.
    // O nome vive na própria transação (custom_name); só é guardado quando
    // difere do nome global atual do comerciante.
    const customName = nome && nome !== nomeGlobal ? nome : null;
    const { error } = await supabase
      .from("transactions")
      .update({
        category_id: categoriaId,
        categorized_by: categoriaId ? "manual" : "none",
        custom_name: customName,
      })
      .eq("id", transacaoId);

    if (error) {
      console.error("Erro ao guardar exceção da transação:", error);
      redirect(`/transacoes/${transacaoId}?erro=guardar`);
    }

    revalidatePath("/", "layout");
    redirect("/transacoes?categorizada=1");
  }

  // Comportamento normal: aprende para todas as transações do comerciante.
  // Limpa qualquer exceção pontual anterior (o global volta a mandar).
  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoriaId,
      categorized_by: categoriaId ? "manual" : "none",
      custom_name: null,
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

  // Nome personalizado: guardar quando difere do resolvido; limpar remove
  const chave = chaveDoNome(transacao.description, transacao.counterparty);
  if (chave) {
    if (nome && nome !== nomePredefinido) {
      const { error: erroNome } = await supabase
        .from("merchant_names")
        .upsert(
          { user_id: user.id, match_value: chave, display_name: nome },
          { onConflict: "user_id,match_value" }
        );
      if (erroNome) console.error("Erro ao guardar nome:", erroNome);
    } else if (!nome) {
      await supabase
        .from("merchant_names")
        .delete()
        .eq("match_value", chave);
    }
  }

  revalidatePath("/", "layout");
  redirect("/transacoes?categorizada=1");
}

/**
 * Marca/desmarca uma transação como "movimento" — dinheiro que vai e volta
 * (reembolso, transferência entre contas próprias). Movimentos não contam
 * como gasto nem ganho nas estatísticas, mas continuam no saldo.
 */
export async function alternarMovimento(formData: FormData) {
  const transacaoId = formData.get("transacao_id") as string;
  const movimento = formData.get("movimento") === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("transactions")
    .update({ is_movement: movimento })
    .eq("id", transacaoId);

  if (error) {
    console.error("Erro ao marcar movimento:", error);
    redirect(`/transacoes/${transacaoId}?erro=guardar`);
  }

  revalidatePath("/", "layout");
  redirect(`/transacoes/${transacaoId}`);
}
