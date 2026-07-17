import "server-only";

// Motor de regras de categorização automática. As regras são avaliadas
// por prioridade crescente; a primeira que corresponder ganha.

export interface RegraCategorizacao {
  id: string;
  priority: number;
  match_field: "description" | "counterparty" | "amount";
  match_type: "contains" | "equals" | "regex" | "between";
  match_value: string;
  category_id: string;
}

export interface TransacaoParaCategorizar {
  description: string | null;
  counterparty: string | null;
  amount: number | string;
}

// "Pingo Doce" corresponde a "PINGO DOCE" e "Salário" a "SALARIO"
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function regraCorresponde(
  regra: RegraCategorizacao,
  t: TransacaoParaCategorizar
): boolean {
  if (regra.match_field === "amount") {
    const valor = Number(t.amount);
    if (Number.isNaN(valor)) return false;
    if (regra.match_type === "between") {
      const [min, max] = regra.match_value.split(",").map(Number);
      return valor >= min && valor <= max;
    }
    if (regra.match_type === "equals") {
      return valor === Number(regra.match_value);
    }
    return false;
  }

  const texto = t[regra.match_field];
  if (!texto) return false;

  switch (regra.match_type) {
    case "contains":
      // "CONTINENTE|PINGO DOCE|LIDL" — qualquer alternativa serve
      return regra.match_value
        .split("|")
        .some((p) => p.trim() && normalizar(texto).includes(normalizar(p)));
    case "equals":
      return normalizar(texto) === normalizar(regra.match_value);
    case "regex":
      try {
        return new RegExp(regra.match_value, "i").test(texto);
      } catch {
        return false; // regex inválida nunca corresponde
      }
    default:
      return false;
  }
}

/** Devolve a categoria da primeira regra que corresponder, ou null. */
export function aplicarRegras(
  regras: RegraCategorizacao[],
  t: TransacaoParaCategorizar
): string | null {
  const ordenadas = [...regras].sort((a, b) => a.priority - b.priority);
  for (const regra of ordenadas) {
    if (regraCorresponde(regra, t)) return regra.category_id;
  }
  return null;
}

// Palavras sem valor identificativo nas descrições bancárias
const PALAVRAS_IGNORADAS = new Set([
  "o", "a", "os", "as", "de", "da", "do", "dos", "das", "e", "em",
  "no", "na", "nos", "nas", "the", "c", "deb", "com", "por",
  "compra", "compras", "pag", "pagamento", "trf", "transf",
  "transferencia", "mbway", "mb", "way", "dd", "deb", "cred", "cdeb",
  // códigos técnicos da CGD (transferências, wallets, levantamentos)
  "tfi", "car", "wal", "crt", "db", "cr", "vcher", "bx", "valor",
  "https", "www",
]);

// Marcadores no início de transferências de/para pessoas (CGD):
// "TFI MIGUEL VIEIRA SEA", "TRF MBWAY 935XXX142", "Trf Mbway"…
const MARCADOR_TRANSFERENCIA =
  /^(?:(?:TFI|TRF|TRANSF(?:ERENCIA)?)\.?\s+)+(?:MB\s?WAY\.?\s*)?/i;

/**
 * Extrai a palavra-chave que identifica o comerciante numa descrição
 * bancária: "COMPRAS C.DEB H3 ALEG" → "H3"; "Mbway 935XXX142" → "935XXX142".
 *
 * Em transferências a identidade é o NOME COMPLETO, não a primeira palavra:
 * "TFI MIGUEL VIEIRA SEA" e "TFI MIGUEL ALEXANDRE" são pessoas diferentes.
 * A chave mantém as palavras contíguas (é substring da descrição — a página
 * de comerciante pesquisa por ilike) e para em referências numéricas ou
 * tokens de 1 letra (truncaturas do banco).
 * Devolve null se nada tiver valor identificativo.
 */
export function extrairPalavraChave(descricao: string | null): string | null {
  if (!descricao?.trim()) return null;
  const texto = descricao.trim();

  const marcador = MARCADOR_TRANSFERENCIA.exec(texto);
  if (marcador && marcador[0].length > 0 && marcador[0].length < texto.length) {
    const resto = texto.slice(marcador[0].length);
    const uteis: string[] = [];
    for (const token of resto.split(/\s+/)) {
      const puro = token.replace(/[^\p{L}\p{N}]/gu, "");
      if (puro.length < 2) break; // truncatura ("...DE G")
      if (/^\d{5,}$/.test(puro)) break; // número de referência
      uteis.push(puro.toUpperCase());
      if (uteis.length === 4) break;
    }
    if (uteis.length > 0) return uteis.join(" ");
    // transferência sem nome (ex: "TRF MBWAY") — segue o caminho clássico
  }

  // Retirar prefixos técnicos ("COMPRAS C.DEB", "PAG.", "TRF."...) primeiro,
  // senão tokens como "C.DEB" ganham o lugar do comerciante
  const semPrefixo = texto.replace(
    /^(COMPRAS?\s+C\.?\s?DEB\.?|PAG(AMENTO)?\.?|TRF\.?|DD\.?)\s*/i,
    ""
  );
  const tokens = semPrefixo.split(/\s+/);
  for (const token of tokens) {
    const puro = token.replace(/[^\p{L}\p{N}]/gu, "");
    if (puro.length < 2) continue;
    if (PALAVRAS_IGNORADAS.has(normalizar(puro))) continue;
    return puro.toUpperCase();
  }
  return null;
}

/**
 * Constrói a regra "aprendida" ao categorizar manualmente uma transação.
 * Palavra-chave da descrição → regex com fronteiras de palavra (para "BP"
 * não apanhar "BPI"); sem palavra-chave, usa a contraparte por igualdade.
 */
export function regraAprendida(
  descricao: string | null,
  contraparte: string | null
): { match_field: "description" | "counterparty"; match_type: "regex" | "equals"; match_value: string } | null {
  const palavra = extrairPalavraChave(descricao);
  if (palavra) {
    const escapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      match_field: "description",
      match_type: "regex",
      match_value: `\\b${escapada}\\b`,
    };
  }
  if (contraparte?.trim()) {
    return {
      match_field: "counterparty",
      match_type: "equals",
      match_value: contraparte.trim(),
    };
  }
  return null;
}
