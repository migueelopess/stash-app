const formatoEuros = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

const formatoData = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Formata um valor em euros: 1234.56 → "1 234,56 €" */
export function formatarEuros(valor: number | string | null): string {
  if (valor === null || valor === undefined) return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (Number.isNaN(n)) return "—";
  return formatoEuros.format(n);
}

/** Formata uma data ISO: "2026-07-03" → "03/07/2026" */
export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return formatoData.format(new Date(iso));
}

/** Dias que faltam até uma data (negativo se já passou). */
export function diasAte(iso: string): number {
  const alvo = new Date(iso).getTime();
  return Math.ceil((alvo - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Título apresentável para uma transação: prefere a contraparte;
 * senão limpa prefixos técnicos da descrição bancária
 * (ex.: "COMPRAS C.DEB TICKETL" → "TICKETL").
 */
export function tituloTransacao(
  contraparte: string | null,
  descricao: string | null
): string {
  if (contraparte?.trim()) return contraparte.trim();
  if (!descricao?.trim()) return "Transação";
  return descricao
    .replace(/^(COMPRAS?\s+C\.?\s?DEB\.?|PAG(AMENTO)?\.?|TRF\.?|DD\.?)\s*/i, "")
    .trim() || descricao.trim();
}
