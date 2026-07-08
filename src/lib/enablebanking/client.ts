import "server-only";
import { unstable_cache } from "next/cache";
import { criarJwtEb } from "./jwt";
import type {
  EbAspsp,
  EbBalance,
  EbSession,
  EbTransaction,
} from "./types";

const EB_BASE_URL = "https://api.enablebanking.com";

async function ebFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await criarJwtEb();
  const res = await fetch(`${EB_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Enable Banking ${res.status} em ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/** Lista os bancos disponíveis para a aplicação (sandbox: só o Mock ASPSP). */
export async function listarAspsps(): Promise<EbAspsp[]> {
  const data = await ebFetch<{ aspsps: EbAspsp[] }>("/aspsps");
  return data.aspsps;
}

/**
 * Versão com cache (6h): a lista de bancos quase nunca muda e o pedido à
 * Enable Banking custa segundos — sem cache tornava a página Contas lenta.
 */
export const listarAspspsComCache = unstable_cache(
  listarAspsps,
  ["eb-aspsps"],
  { revalidate: 6 * 60 * 60 }
);

/** Inicia a autorização PSD2: devolve o URL do banco para redirecionar o utilizador. */
export async function iniciarAutorizacao(params: {
  aspspName: string;
  aspspCountry: string;
  state: string;
  validUntil: string; // ISO 8601
}): Promise<{ url: string }> {
  return ebFetch<{ url: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({
      access: { valid_until: params.validUntil },
      aspsp: { name: params.aspspName, country: params.aspspCountry },
      state: params.state,
      redirect_url: process.env.EB_REDIRECT_URL,
      psu_type: "personal",
      language: "pt",
    }),
  });
}

/** Troca o code do callback por uma sessão com a lista de contas. */
export async function criarSessao(code: string): Promise<EbSession> {
  return ebFetch<EbSession>("/sessions", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/** Saldos de uma conta. */
export async function obterSaldos(accountUid: string): Promise<EbBalance[]> {
  const data = await ebFetch<{ balances: EbBalance[] }>(
    `/accounts/${accountUid}/balances`
  );
  return data.balances;
}

/** Transações de uma conta (paginado por continuation_key). */
export async function obterTransacoes(
  accountUid: string,
  opts?: { dateFrom?: string; continuationKey?: string }
): Promise<{ transactions: EbTransaction[]; continuation_key?: string }> {
  const params = new URLSearchParams();
  if (opts?.dateFrom) params.set("date_from", opts.dateFrom);
  if (opts?.continuationKey)
    params.set("continuation_key", opts.continuationKey);
  const qs = params.size > 0 ? `?${params.toString()}` : "";
  return ebFetch(`/accounts/${accountUid}/transactions${qs}`);
}
