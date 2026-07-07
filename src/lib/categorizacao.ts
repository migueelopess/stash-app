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
