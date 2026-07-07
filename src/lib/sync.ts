import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { obterSaldos, obterTransacoes } from "@/lib/enablebanking/client";
import type { EbTransaction } from "@/lib/enablebanking/types";

const DIAS_HISTORICO_INICIAL = 90; // primeira sync: 90 dias para trás
const DIAS_SOBREPOSICAO = 7; // re-sync com sobreposição para apanhar atrasados

export interface ContaParaSync {
  id: string;
  eb_account_uid: string;
}

export interface LigacaoParaSync {
  id: string;
  bank_name: string;
  status: string;
  valid_until: string;
  accounts: ContaParaSync[];
}

export interface ResultadoSync {
  novas: number;
  contasComErro: number;
}

function dataIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Sem entry_reference (alguns bancos omitem), gerar um id determinístico
// para o dedupe continuar a funcionar no re-sync.
function idTransacao(uid: string, t: EbTransaction): string {
  if (t.entry_reference) return t.entry_reference;
  const base = JSON.stringify([
    uid,
    t.booking_date,
    t.transaction_amount,
    t.credit_debit_indicator,
    t.remittance_information,
  ]);
  return `hash-${createHash("sha256").update(base).digest("hex").slice(0, 32)}`;
}

function mapearTransacao(conta: ContaParaSync, t: EbTransaction) {
  const valor = Number(t.transaction_amount.amount);
  const sinal = t.credit_debit_indicator === "DBIT" ? -1 : 1;
  const contraparte =
    t.credit_debit_indicator === "DBIT" ? t.creditor?.name : t.debtor?.name;

  return {
    account_id: conta.id,
    eb_transaction_id: idTransacao(conta.eb_account_uid, t),
    booking_date: t.booking_date ?? t.value_date ?? dataIso(new Date()),
    amount: (sinal * valor).toFixed(2),
    currency: t.transaction_amount.currency ?? "EUR",
    description: t.remittance_information?.join(" ") ?? null,
    counterparty: contraparte ?? null,
    raw: t,
  };
}

async function sincronizarConta(
  supabase: SupabaseClient,
  conta: ContaParaSync
): Promise<number> {
  // Desde a última transação conhecida (com sobreposição), senão 90 dias
  const { data: ultima } = await supabase
    .from("transactions")
    .select("booking_date")
    .eq("account_id", conta.id)
    .order("booking_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const inicio = new Date();
  if (ultima?.booking_date) {
    inicio.setTime(new Date(ultima.booking_date).getTime());
    inicio.setDate(inicio.getDate() - DIAS_SOBREPOSICAO);
  } else {
    inicio.setDate(inicio.getDate() - DIAS_HISTORICO_INICIAL);
  }

  let novas = 0;
  let continuationKey: string | undefined;

  do {
    const pagina = await obterTransacoes(conta.eb_account_uid, {
      dateFrom: dataIso(inicio),
      continuationKey,
    });

    const linhas = pagina.transactions
      .filter((t) => (t.status ?? "BOOK") === "BOOK")
      .map((t) => mapearTransacao(conta, t));

    if (linhas.length > 0) {
      const { count, error } = await supabase
        .from("transactions")
        .upsert(linhas, {
          onConflict: "eb_transaction_id",
          ignoreDuplicates: true,
          count: "exact",
        });
      if (error) throw error;
      novas += count ?? 0;
    }

    continuationKey = pagina.continuation_key;
  } while (continuationKey);

  // Atualizar o saldo
  const saldos = await obterSaldos(conta.eb_account_uid);
  const saldo = saldos.find((s) => s.balance_type === "CLBD") ?? saldos[0];
  if (saldo) {
    await supabase
      .from("accounts")
      .update({
        balance: saldo.balance_amount.amount,
        balance_updated_at: new Date().toISOString(),
      })
      .eq("id", conta.id);
  }

  return novas;
}

/** Sincroniza todas as contas de uma ligação. Erros numa conta não travam as restantes. */
export async function sincronizarLigacao(
  supabase: SupabaseClient,
  ligacao: LigacaoParaSync
): Promise<ResultadoSync> {
  // Autorização PSD2 caducada → marcar e não gastar chamadas
  if (new Date(ligacao.valid_until).getTime() < Date.now()) {
    await supabase
      .from("bank_connections")
      .update({ status: "expired" })
      .eq("id", ligacao.id);
    return { novas: 0, contasComErro: 0 };
  }

  let novas = 0;
  let contasComErro = 0;

  for (const conta of ligacao.accounts) {
    try {
      novas += await sincronizarConta(supabase, conta);
    } catch (e) {
      contasComErro++;
      console.error(
        `Erro ao sincronizar conta ${conta.eb_account_uid} (${ligacao.bank_name}):`,
        e
      );
    }
  }

  await supabase
    .from("bank_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", ligacao.id);

  return { novas, contasComErro };
}

export const SELECT_LIGACOES_SYNC =
  "id, bank_name, status, valid_until, accounts (id, eb_account_uid)";
