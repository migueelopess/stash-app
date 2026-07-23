// Helpers de perfil. Puro (sem server-only) para poder correr no cliente.
// O nome, a cor e o URL da foto vivem no user_metadata do Supabase Auth.

import { PALETA } from "@/lib/paleta";

export interface DadosPerfil {
  nome: string | null;
  email: string;
  avatarUrl: string | null;
  cor: string;
}

interface UtilizadorLike {
  email?: string | null;
  user_metadata?: {
    display_name?: string | null;
    avatar_url?: string | null;
    avatar_color?: string | null;
  } | null;
}

/** Cor estável a partir do email, para quem ainda não escolheu nenhuma. */
export function corPorDefeito(semente: string): string {
  let h = 0;
  for (let i = 0; i < semente.length; i++) {
    h = (h * 31 + semente.charCodeAt(i)) >>> 0;
  }
  return PALETA[h % PALETA.length];
}

/** Extrai os dados de perfil de um utilizador do Supabase Auth. */
export function dadosPerfil(user: UtilizadorLike | null): DadosPerfil {
  const email = user?.email ?? "";
  const meta = user?.user_metadata ?? {};
  const nome = meta.display_name?.trim() || null;
  return {
    nome,
    email,
    avatarUrl: meta.avatar_url?.trim() || null,
    cor: meta.avatar_color?.trim() || corPorDefeito(email || "stash"),
  };
}

/**
 * Iniciais para o avatar: duas letras a partir do nome (primeira + última
 * palavra) ou, na sua falta, do email.
 */
export function iniciais(nome: string | null, email: string): string {
  const fonte = nome?.trim() || email.split("@")[0] || "";
  const palavras = fonte
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (palavras.length === 0) return "?";
  if (palavras.length === 1) {
    return palavras[0].slice(0, 2).toUpperCase();
  }
  return (
    palavras[0][0] + palavras[palavras.length - 1][0]
  ).toUpperCase();
}

/** Primeiro nome, para saudações. */
export function primeiroNome(nome: string | null, email: string): string {
  const fonte = nome?.trim() || email.split("@")[0] || "";
  const primeira = fonte.split(/\s+/)[0] ?? "";
  if (!primeira) return "";
  return primeira.charAt(0).toUpperCase() + primeira.slice(1);
}
