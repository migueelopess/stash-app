import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarPush } from "@/lib/notificacoes";
import {
  chavePeriodo,
  estadoDoOrcamento,
  nomeDoOrcamento,
  type OrcamentoComCategoria,
  type TransacaoParaOrcamento,
} from "@/lib/orcamentos";

const euros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

/**
 * Verifica os orçamentos do utilizador e envia alertas push quando um
 * limiar novo é atravessado (80% ou 100%). alert_level/alert_period na BD
 * garantem que cada alerta dispara uma única vez por período.
 */
export async function verificarAlertasDeOrcamentos(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    const { data: orcamentosRaw } = await supabase
      .from("budgets")
      .select(
        "id, category_id, amount, period, alert_level, alert_period, categories (name, color, icon)"
      )
      .eq("user_id", userId);

    const orcamentos = (orcamentosRaw ?? []) as unknown as (OrcamentoComCategoria & {
      alert_level: number;
      alert_period: string | null;
    })[];
    if (orcamentos.length === 0) return;

    // Transações de gasto do ano corrente (cobre mensais e anuais)
    const inicioAno = `${new Date().getFullYear()}-01-01`;
    const { data: transacoesRaw } = await supabase
      .from("transactions")
      .select("booking_date, amount, category_id, accounts!inner(bank_connections!inner(user_id))")
      .lt("amount", 0)
      .gte("booking_date", inicioAno)
      .eq("accounts.bank_connections.user_id", userId);

    const transacoes: TransacaoParaOrcamento[] = (transacoesRaw ?? []).map(
      (t) => ({
        booking_date: t.booking_date as string,
        amount: Number(t.amount),
        category_id: (t.category_id as string | null) ?? null,
      })
    );

    for (const orcamento of orcamentos) {
      const estado = estadoDoOrcamento(orcamento, transacoes);
      const periodo = chavePeriodo(orcamento.period);

      // Novo período → recomeçar os alertas
      const nivelGuardado =
        orcamento.alert_period === periodo ? orcamento.alert_level : 0;

      const nivelAtual =
        estado.percentagem >= 100 ? 100 : estado.percentagem >= 80 ? 80 : 0;

      if (nivelAtual > nivelGuardado) {
        const nome = nomeDoOrcamento(orcamento);
        const notificacao =
          nivelAtual === 100
            ? {
                titulo: `🚨 Orçamento de ${nome} ultrapassado`,
                corpo: `Gastaste ${euros.format(estado.gasto)} de um limite de ${euros.format(estado.limite)}.`,
                url: "/orcamentos",
              }
            : {
                titulo: `⚠️ Orçamento de ${nome} nos ${Math.round(estado.percentagem)}%`,
                corpo: `Já gastaste ${euros.format(estado.gasto)} de ${euros.format(estado.limite)}. Sobram ${euros.format(estado.restante)}.`,
                url: "/orcamentos",
              };

        await enviarPush(supabase, userId, notificacao);
      }

      // Atualizar o estado mesmo quando desce (novo período, correções)
      if (
        nivelAtual !== orcamento.alert_level ||
        periodo !== orcamento.alert_period
      ) {
        await supabase
          .from("budgets")
          .update({ alert_level: nivelAtual, alert_period: periodo })
          .eq("id", orcamento.id);
      }
    }
  } catch (e) {
    console.error("Erro ao verificar alertas de orçamentos:", e);
  }
}

/**
 * Aviso de renovação PSD2: dispara quando faltam exatamente 7, 3 ou 1 dias.
 * Como o cron corre uma vez por dia, cada marco só é enviado uma vez.
 */
export async function verificarAlertasDeRenovacao(
  supabase: SupabaseClient,
  userId: string,
  ligacoes: { bank_name: string; valid_until: string }[]
): Promise<void> {
  try {
    for (const ligacao of ligacoes) {
      const dias = Math.ceil(
        (new Date(ligacao.valid_until).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );
      if (dias === 7 || dias === 3 || dias === 1) {
        await enviarPush(supabase, userId, {
          titulo: `🔑 Autorização do ${ligacao.bank_name} a expirar`,
          corpo: `Expira ${dias === 1 ? "amanhã" : `em ${dias} dias`} — renova na página Contas para o sync continuar.`,
          url: "/contas",
        });
      }
    }
  } catch (e) {
    console.error("Erro ao verificar alertas de renovação:", e);
  }
}
