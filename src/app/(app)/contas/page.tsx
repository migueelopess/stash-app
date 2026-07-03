import { Landmark, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listarAspsps } from "@/lib/enablebanking/client";
import { ebConfigurado } from "@/lib/enablebanking/jwt";
import type { EbAspsp } from "@/lib/enablebanking/types";
import { diasAte, formatarData, formatarEuros } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { ligarBanco } from "./actions";

const BANCOS_SUPORTADOS = /mock|caixa geral|cgd|bpi|santander/i;

const MENSAGENS_ERRO: Record<string, string> = {
  banco_invalido: "Banco inválido. Tenta novamente.",
  autorizacao: "Não foi possível iniciar a autorização no banco.",
  autorizacao_cancelada: "A autorização foi cancelada no banco.",
  state_invalido:
    "O pedido de autorização expirou ou é inválido. Tenta novamente.",
  gravar_ligacao: "A autorização foi dada mas falhou a gravação da ligação.",
  gravar_contas: "A autorização foi dada mas falhou a gravação das contas.",
  sessao: "Não foi possível criar a sessão com o banco.",
};

interface Conta {
  id: string;
  name: string | null;
  iban: string | null;
  balance: string | null;
  balance_updated_at: string | null;
}

interface Ligacao {
  id: string;
  bank_name: string;
  valid_until: string;
  status: string;
  accounts: Conta[];
}

function BadgeEstado({ ligacao }: { ligacao: Ligacao }) {
  const dias = diasAte(ligacao.valid_until);
  if (ligacao.status !== "active" || dias <= 0) {
    return <Badge variant="destructive">Expirada</Badge>;
  }
  if (dias <= 14) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        Expira em {dias} {dias === 1 ? "dia" : "dias"}
      </Badge>
    );
  }
  return <Badge variant="secondary">Ativa</Badge>;
}

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const { sucesso, erro } = await searchParams;
  const supabase = await createClient();

  const { data: ligacoes } = (await supabase
    .from("bank_connections")
    .select(
      "id, bank_name, valid_until, status, accounts (id, name, iban, balance, balance_updated_at)"
    )
    .order("bank_name")) as { data: Ligacao[] | null };

  const configurado = ebConfigurado();
  let bancosDisponiveis: EbAspsp[] = [];
  let erroAspsps = false;
  if (configurado) {
    try {
      const todos = await listarAspsps();
      bancosDisponiveis = todos.filter(
        (b) => b.country === "PT" && BANCOS_SUPORTADOS.test(b.name)
      );
    } catch (e) {
      console.error("Erro ao listar bancos Enable Banking:", e);
      erroAspsps = true;
    }
  }

  const bancosJaLigados = new Set(
    (ligacoes ?? []).map((ligacao) => ligacao.bank_name)
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Contas</h1>

      {sucesso && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Banco ligado com sucesso. As contas já estão disponíveis.
        </p>
      )}
      {erro && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {MENSAGENS_ERRO[erro] ?? "Ocorreu um erro. Tenta novamente."}
        </p>
      )}

      {(ligacoes ?? []).map((ligacao) => (
        <Card key={ligacao.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="size-4" />
              {ligacao.bank_name}
            </CardTitle>
            <BadgeEstado ligacao={ligacao} />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {ligacao.accounts.map((conta) => (
              <div
                key={conta.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {conta.name ?? "Conta"}
                  </p>
                  {conta.iban && (
                    <p className="truncate text-xs text-muted-foreground">
                      {conta.iban}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatarEuros(conta.balance)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Autorização até {formatarData(ligacao.valid_until)}
              </p>
              <form action={ligarBanco}>
                <input
                  type="hidden"
                  name="aspsp_name"
                  value={ligacao.bank_name}
                />
                <input type="hidden" name="aspsp_country" value="PT" />
                <Button type="submit" variant="outline" size="sm">
                  Renovar
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ligar novo banco</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!configurado && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              As credenciais da Enable Banking ainda não estão configuradas
              (EB_APPLICATION_ID e EB_PRIVATE_KEY no .env.local).
            </p>
          )}
          {configurado && erroAspsps && (
            <p className="text-sm text-destructive">
              Não foi possível contactar a Enable Banking. Verifica as
              credenciais.
            </p>
          )}
          {configurado &&
            !erroAspsps &&
            bancosDisponiveis.map((banco) => {
              const jaLigado = bancosJaLigados.has(banco.name);
              return (
                <form key={`${banco.name}-${banco.country}`} action={ligarBanco}>
                  <input type="hidden" name="aspsp_name" value={banco.name} />
                  <input
                    type="hidden"
                    name="aspsp_country"
                    value={banco.country}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={jaLigado}
                  >
                    <span>
                      {banco.name}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {banco.country}
                      </span>
                    </span>
                    {jaLigado ? "Já ligado" : "Ligar"}
                  </Button>
                </form>
              );
            })}
          {configurado && !erroAspsps && bancosDisponiveis.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum banco disponível para esta aplicação.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
