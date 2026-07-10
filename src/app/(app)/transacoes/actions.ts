"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verificarAlertasDeOrcamentos } from "@/lib/alertas";
import { createClient } from "@/lib/supabase/server";
import {
  SELECT_LIGACOES_SYNC,
  sincronizarLigacao,
  type LigacaoParaSync,
} from "@/lib/sync";

export async function sincronizarAgora() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: ligacoes, error } = await supabase
    .from("bank_connections")
    .select(SELECT_LIGACOES_SYNC)
    .eq("status", "active");

  if (error) {
    console.error("Erro ao carregar ligações para sync:", error);
    redirect("/transacoes?sync=erro");
  }

  let novas = 0;
  let contasComErro = 0;
  let limiteAtingido = false;
  for (const ligacao of (ligacoes ?? []) as unknown as LigacaoParaSync[]) {
    const resultado = await sincronizarLigacao(supabase, ligacao);
    novas += resultado.novas;
    contasComErro += resultado.contasComErro;
    limiteAtingido = limiteAtingido || resultado.limiteAtingido;
  }

  await verificarAlertasDeOrcamentos(supabase, user.id);

  revalidatePath("/", "layout");
  if (contasComErro > 0) {
    redirect("/transacoes?sync=erro");
  }
  // Limite diário só interessa avisar se não trouxe nada de novo
  if (limiteAtingido && novas === 0) {
    redirect("/transacoes?sync=limite");
  }
  redirect(`/transacoes?sync=ok&novas=${novas}`);
}
