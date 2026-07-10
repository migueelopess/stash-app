import { NextResponse, type NextRequest } from "next/server";
import {
  verificarAlertasDeOrcamentos,
  verificarAlertasDeRenovacao,
} from "@/lib/alertas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  SELECT_LIGACOES_SYNC,
  sincronizarLigacao,
  type LigacaoParaSync,
} from "@/lib/sync";

// Sincroniza transações e saldos.
// - Vercel Cron: GET com Authorization: Bearer <CRON_SECRET> → todos os utilizadores
// - Utilizador autenticado: GET normal → só as ligações dele (RLS)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const eCron =
    Boolean(process.env.CRON_SECRET) &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`;

  let supabase;
  if (eCron) {
    supabase = createAdminClient();
  } else {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
    }
  }

  const { data: ligacoes, error } = await supabase
    .from("bank_connections")
    .select(SELECT_LIGACOES_SYNC)
    .eq("status", "active");

  if (error) {
    console.error("Erro ao carregar ligações para sync:", error);
    return NextResponse.json({ erro: "erro interno" }, { status: 500 });
  }

  let novas = 0;
  let contasComErro = 0;
  const lista = (ligacoes ?? []) as unknown as (LigacaoParaSync & {
    valid_until: string;
  })[];
  for (const ligacao of lista) {
    const resultado = await sincronizarLigacao(supabase, ligacao);
    novas += resultado.novas;
    contasComErro += resultado.contasComErro;
  }

  // Alertas (orçamentos + renovação PSD2) por utilizador, após o sync
  const porUtilizador = new Map<string, typeof lista>();
  for (const ligacao of lista) {
    const doUtilizador = porUtilizador.get(ligacao.user_id) ?? [];
    doUtilizador.push(ligacao);
    porUtilizador.set(ligacao.user_id, doUtilizador);
  }
  for (const [userId, doUtilizador] of porUtilizador) {
    await verificarAlertasDeOrcamentos(supabase, userId);
    if (eCron) {
      // só no cron diário, para os marcos 7/3/1 dias dispararem uma vez
      await verificarAlertasDeRenovacao(supabase, userId, doUtilizador);
    }
  }

  return NextResponse.json({ novas, contasComErro });
}
