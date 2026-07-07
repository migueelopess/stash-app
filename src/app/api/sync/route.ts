import { NextResponse, type NextRequest } from "next/server";
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
  for (const ligacao of (ligacoes ?? []) as unknown as LigacaoParaSync[]) {
    const resultado = await sincronizarLigacao(supabase, ligacao);
    novas += resultado.novas;
    contasComErro += resultado.contasComErro;
  }

  return NextResponse.json({ novas, contasComErro });
}
