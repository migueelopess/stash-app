// Dicionário de comerciantes portugueses → nome de categoria (seed global).
//
// Regras de correspondência (ver categoriaDoDicionario):
// - Termo com espaço: procurado como frase inteira na descrição normalizada
// - Termo com "*" no fim: prefixo de token (ex.: "BK*" apanha "BK26368")
// - Termo simples: igual ao token, OU o token é um corte do termo
//   ("CONTINE" ⊂ "CONTINENTE" — os bancos cortam aos ~20 caracteres),
//   OU o termo é prefixo do token ("APPLE" apanha "APPLEC" de "APPLE.C")
// - Tokens "A8"/"A21"/... (autoestradas) → Transportes, via regra especial
//
// A ordem importa: entradas mais específicas primeiro ("UBER EATS" antes
// de "UBER", "GALP POWER" antes de "GALP", "AMAZON PRIME" antes de "AMAZON").

interface EntradaDicionario {
  categoria: string;
  termos: string[];
}

export const DICIONARIO: EntradaDicionario[] = [
  // ——— específicos primeiro (desambiguação) ———
  { categoria: "Alimentação", termos: ["UBER EATS", "UBER E", "BOLT FOOD"] },
  { categoria: "Casa", termos: ["GALP POWER", "GALP ENERGIA"] },
  { categoria: "Subscrições", termos: ["AMAZON PRIME", "PRIME VIDEO"] },

  {
    categoria: "Alimentação",
    termos: [
      // supermercados
      "CONTINENTE", "MODELO", "PINGO DOCE", "LIDL", "ALDI", "AUCHAN",
      "INTERMARCHE", "MINIPRECO", "MERCADONA", "MERCADO", "SPAR",
      "MEU SUPER", "AMANHECER", "RECHEIO", "MAKRO", "CELEIRO", "APOLONIA",
      "SUPERMERCADO", "MINIMERCADO", "MERCEARIA", "FRUTARIA", "TALHO",
      "PEIXARIA", "PADARIA", "PASTELARIA", "PAO",
      // restauração
      "MCDONALDS", "BURGER KING", "BK*", "KFC", "PIZZA HUT", "TELEPIZZA",
      "DOMINOS", "PIZZARIA", "PIZZA", "H3", "VITAMINAS", "PANS", "SUBWAY",
      "SUSHI", "POKE", "KEBAB", "RISTORANTE", "RESTAURANTE", "CANTINA",
      "CAFETARIA", "CAFE", "CERVEJARIA", "CHURRASQUEIRA", "CHURRASCO",
      "HAMBURGUERIA", "MARISQUEIRA", "TASCA", "TABERNA", "SNACK",
      "GELATARIA", "GELADOS", "STARBUCKS", "BIFANAS", "ZAHIR",
      "PINGO", "CONT MO", "VENDING", "PAST*", "PREGO",
      // entregas
      "GLOVO", "JUST EAT",
    ],
  },
  {
    categoria: "Transportes",
    termos: [
      "GALP", "BP", "REPSOL", "CEPSA", "PRIO", "COMBUSTIVEL", "GASOLINEIRA",
      "VIA VERDE", "VIAVERDE", "PORTAGEM", "CP", "COMBOIOS", "METRO",
      "CARRIS", "NAVEGANTE", "FERTAGUS", "TST", "FLIXBUS", "REDE EXPRESSOS",
      "UBER", "BOLT", "TAXI", "TVDE", "EMEL", "TELPARK", "ESTACIONAMENTO",
      "PARQUE",
    ],
  },
  {
    categoria: "Lazer",
    termos: [
      // apostas e jogos
      "BETCLIC", "PLACARD", "BWIN", "BETANO", "SOLVERDE", "POKERSTARS",
      "STEAM", "PLAYSTATION", "PSN", "XBOX", "NINTENDO", "EPIC GAMES",
      // saídas
      "CINEMA", "CINEMAS", "UCI", "CINEPLACE", "BOWLING", "KARTING",
      "PADEL", "FITNESS", "GINASIO", "SOLINCA", "PUMP", "TICKETLINE",
      "3CKET", "PRAXE", "HIPAY",
      // viagens
      "AIRBNB", "BOOKING", "RYANAIR", "EASYJET", "WIZZ", "TAP PORTUGAL",
    ],
  },
  {
    categoria: "Subscrições",
    termos: [
      "SPOTIFY", "NETFLIX", "HBO", "DISNEY", "YOUTUBE", "APPLE", "ICLOUD",
      "GOOGLE", "TWITCH", "DISCORD", "OPENAI", "CHATGPT", "ANTHROPIC",
      "CRUNCHYROLL", "MEO", "NOS", "VODAFONE", "DIGI", "MOCHE", "UZO",
      "WTF", "NOWO", "LYCAMOBILE", "CLAUDE", "ALTICE",
    ],
  },
  {
    categoria: "Educação",
    termos: [
      "COFAC", "LUSOFONA", "UNIVERSIDADE", "FACULDADE", "ESCOLA",
      "PROPINA", "PROPINAS", "UDEMY", "COURSERA",
    ],
  },
  {
    categoria: "Saúde",
    termos: [
      "FARMACIA", "WELLS", "CLINICA", "HOSPITAL", "CUF", "LUSIADAS",
      "LUZ SAUDE", "DENTISTA", "DENTAL", "OPTICA", "MULTIOPTICAS",
      "LABORATORIO", "ANALISES",
    ],
  },
  {
    categoria: "Cuidados pessoais",
    termos: [
      "BARBEARIA", "BARBEIRO", "BARBER", "UNICUTZ", "CABELEIREIRO",
      "CABELEIREIRA", "ESTETICA", "SPA", "PERFUMES", "PRIMOR",
    ],
  },
  {
    categoria: "Casa",
    termos: [
      "EDP", "ENDESA", "IBERDROLA", "GOLDENERGY", "AGUAS", "EPAL", "SMAS",
      "IKEA", "LEROY MERLIN", "AKI", "BRICOMARCHE", "CONFORAMA", "JYSK",
      "RENDA",
    ],
  },
  {
    categoria: "Compras",
    termos: [
      "WORTEN", "FNAC", "MEDIAMARKT", "RADIO POPULAR", "ZARA", "BERSHKA",
      "PULLBEAR", "STRADIVARIUS", "PRIMARK", "DECATHLON", "SPORT ZONE",
      "NIKE", "ADIDAS", "AMAZON", "ALIEXPRESS", "TEMU", "SHEIN", "VINTED",
      "OLX", "EBAY", "KLARNA", "PAYPAL", "NORMAL", "BULK", "BERTRAND",
      "WOOK", "JD",
    ],
  },
  {
    categoria: "Investimentos",
    termos: [
      "REVOLUT", "TRADING212", "TRADING", "XTB", "DEGIRO", "ETORO",
      "COINBASE", "BINANCE", "KRAKEN", "CAR WAL", "CR VCHER",
    ],
  },
  // MB Way sem marca associada (números de pessoas) — avaliado depois
  // dos comerciantes, para "COMPRA MBWAY - CINEMA" cair em Lazer
  { categoria: "Transferências", termos: ["MBWAY"] },
  { categoria: "Salário", termos: ["SALARIO", "ORDENADO", "VENCIMENTO"] },
  {
    categoria: "Outros",
    termos: [
      "LEVANTAMENTO", "COMISSAO", "COMISSOES", "IMPOSTO", "MANUTENCAO",
      "ANUIDADE", "EASYPAY",
    ],
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

const PORTAGEM = /^A\d{1,2}$/; // A8, A16, A21... autoestradas

/**
 * Categoria sugerida pelo dicionário para uma descrição bancária,
 * ou null se nenhum termo corresponder.
 */
export function categoriaDoDicionario(
  descricao: string | null
): string | null {
  if (!descricao?.trim()) return null;
  const norm = normalizar(descricao);
  const frase = ` ${norm} `;
  const tokens = norm.split(" ");

  for (const { categoria, termos } of DICIONARIO) {
    for (const termo of termos) {
      if (termo.includes(" ")) {
        if (frase.includes(` ${termo} `)) return categoria;
        continue;
      }
      if (termo.endsWith("*")) {
        const base = termo.slice(0, -1);
        if (tokens.some((t) => t.startsWith(base))) return categoria;
        continue;
      }
      for (const token of tokens) {
        if (token === termo) return categoria;
        // o banco cortou o nome: "CONTINE" é prefixo de "CONTINENTE"
        if (token.length >= 5 && termo.startsWith(token)) return categoria;
        // o termo é prefixo do token: "APPLE" apanha "APPLEC"
        if (termo.length >= 4 && token.startsWith(termo)) return categoria;
      }
    }
  }

  // Portagens: tokens tipo "A8"/"A21"
  if (tokens.some((t) => PORTAGEM.test(t))) return "Transportes";

  return null;
}
