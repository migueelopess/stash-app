import { NextResponse, type NextRequest } from "next/server";
import { criarSessao, obterSaldos } from "@/lib/enablebanking/client";
import type { EbAccount } from "@/lib/enablebanking/types";
import { createClient } from "@/lib/supabase/server";

// Callback da autorização Enable Banking: troca o code por uma sessão
// e grava a ligação + contas na base de dados.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const irPara = (destino: string) =>
    NextResponse.redirect(new URL(destino, request.url));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return irPara("/login");
  }

  // Validar o state contra o pedido pendente guardado no cookie
  const pendingRaw = request.cookies.get("eb_pending")?.value;
  let pending: { state: string; name: string; country: string } | null = null;
  try {
    pending = pendingRaw ? JSON.parse(pendingRaw) : null;
  } catch {
    pending = null;
  }

  if (!pending || !state || pending.state !== state) {
    return irPara("/contas?erro=state_invalido");
  }

  if (!code) {
    // O utilizador cancelou ou o banco recusou
    return irPara("/contas?erro=autorizacao_cancelada");
  }

  try {
    const sessao = await criarSessao(code);

    // Upsert da ligação (1 por banco): renovar substitui a sessão antiga
    const { data: ligacao, error: erroLigacao } = await supabase
      .from("bank_connections")
      .upsert(
        {
          user_id: user.id,
          bank_name: pending.name,
          session_id: sessao.session_id,
          valid_until: sessao.access.valid_until,
          status: "active",
        },
        { onConflict: "user_id,bank_name" }
      )
      .select("id")
      .single();

    if (erroLigacao || !ligacao) {
      console.error("Erro ao gravar ligação:", erroLigacao);
      return irPara("/contas?erro=gravar_ligacao");
    }

    // Gravar/atualizar as contas da sessão
    const contas = sessao.accounts.map((conta: EbAccount) => ({
      connection_id: ligacao.id,
      eb_account_uid: conta.uid,
      name: conta.name ?? conta.product ?? pending.name,
      iban: conta.account_id?.iban ?? null,
      currency: conta.currency ?? "EUR",
    }));

    const { error: erroContas } = await supabase
      .from("accounts")
      .upsert(contas, { onConflict: "eb_account_uid" });

    if (erroContas) {
      console.error("Erro ao gravar contas:", erroContas);
      return irPara("/contas?erro=gravar_contas");
    }

    // Buscar saldos iniciais (não crítico — o sync volta a atualizar)
    for (const conta of sessao.accounts) {
      try {
        const saldos = await obterSaldos(conta.uid);
        const saldo =
          saldos.find((s) => s.balance_type === "CLBD") ?? saldos[0];
        if (saldo) {
          await supabase
            .from("accounts")
            .update({
              balance: saldo.balance_amount.amount,
              balance_updated_at: new Date().toISOString(),
            })
            .eq("eb_account_uid", conta.uid);
        }
      } catch (e) {
        console.error(`Erro ao obter saldo da conta ${conta.uid}:`, e);
      }
    }

    const resposta = irPara("/contas?sucesso=1");
    resposta.cookies.delete("eb_pending");
    return resposta;
  } catch (e) {
    console.error("Erro no callback Enable Banking:", e);
    return irPara("/contas?erro=sessao");
  }
}
