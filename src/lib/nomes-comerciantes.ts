import "server-only";
import { extrairPalavraChave } from "./categorizacao";

// Dicionário de nomes: palavra-chave (como aparece cortada nos extratos)
// → nome apresentável. Termos com "*" são prefixos de token.
const NOMES: [string, string][] = [
  // supermercados
  ["CONTINENTE", "Continente"],
  ["CONT MO", "Continente Modelo"],
  ["MODELO", "Continente Modelo"],
  ["PINGO", "Pingo Doce"],
  ["LIDL", "Lidl"],
  ["ALDI", "Aldi"],
  ["AUCHAN", "Auchan"],
  ["INTERMARCHE", "Intermarché"],
  ["MINIPRECO", "Minipreço"],
  ["MERCADONA", "Mercadona"],
  // restauração
  ["MCDONALDS", "McDonald's"],
  ["BK*", "Burger King"],
  ["BURGER KING", "Burger King"],
  ["KFC", "KFC"],
  ["PIZZA HUT", "Pizza Hut"],
  ["TELEPIZZA", "Telepizza"],
  ["H3", "H3"],
  ["VITAMINAS", "Vitaminas"],
  ["GLOVO", "Glovo"],
  ["UBER E", "Uber Eats"],
  ["UBER EATS", "Uber Eats"],
  ["STARBUCKS", "Starbucks"],
  // transportes e combustível
  ["GALP", "Galp"],
  ["BP", "BP"],
  ["REPSOL", "Repsol"],
  ["CEPSA", "Cepsa"],
  ["PRIO", "Prio"],
  ["UBER", "Uber"],
  ["BOLT", "Bolt"],
  ["CP", "CP Comboios"],
  ["METRO", "Metro"],
  ["NAVEGANTE", "Navegante"],
  ["VIA VERDE", "Via Verde"],
  ["FLIXBUS", "FlixBus"],
  ["EMEL", "EMEL"],
  // subscrições e tecnologia
  ["SPOTIFY", "Spotify"],
  ["NETFLIX", "Netflix"],
  ["HBO", "HBO Max"],
  ["DISNEY", "Disney+"],
  ["YOUTUBE", "YouTube"],
  ["APPLE", "Apple"],
  ["ICLOUD", "iCloud"],
  ["GOOGLE", "Google"],
  ["CLAUDE", "Claude"],
  ["CHATGPT", "ChatGPT"],
  ["OPENAI", "OpenAI"],
  ["DISCORD", "Discord"],
  ["TWITCH", "Twitch"],
  ["STEAM", "Steam"],
  ["PLAYSTATION", "PlayStation"],
  ["XBOX", "Xbox"],
  ["NINTENDO", "Nintendo"],
  ["MEO", "MEO"],
  ["NOS", "NOS"],
  ["VODAFONE", "Vodafone"],
  ["ALTICE", "Altice"],
  // apostas, lazer e viagens
  ["BETCLIC", "Betclic"],
  ["PLACARD", "Placard"],
  ["BETANO", "Betano"],
  ["BWIN", "bwin"],
  ["HIPAY", "Betclic (HiPay)"],
  ["CINEMA", "Cinema"],
  ["TICKETLINE", "Ticketline"],
  ["3CKET", "3cket"],
  ["AIRBNB", "Airbnb"],
  ["BOOKING", "Booking.com"],
  ["RYANAIR", "Ryanair"],
  ["EASYJET", "easyJet"],
  // compras
  ["WORTEN", "Worten"],
  ["FNAC", "Fnac"],
  ["MEDIAMARKT", "MediaMarkt"],
  ["ZARA", "Zara"],
  ["PRIMARK", "Primark"],
  ["DECATHLON", "Decathlon"],
  ["NIKE", "Nike"],
  ["ADIDAS", "Adidas"],
  ["AMAZON", "Amazon"],
  ["ALIEXPRESS", "AliExpress"],
  ["TEMU", "Temu"],
  ["SHEIN", "Shein"],
  ["VINTED", "Vinted"],
  ["OLX", "OLX"],
  ["KLARNA", "Klarna"],
  ["PAYPAL", "PayPal"],
  ["JD", "JD Sports"],
  ["IKEA", "IKEA"],
  ["LEROY MERLIN", "Leroy Merlin"],
  ["BULK", "Bulk"],
  ["NORMAL", "NORMAL"],
  // investimentos e transferências
  ["REVOLUT", "Revolut"],
  ["TRADING212", "Trading 212"],
  ["TRADING", "Trading 212"],
  ["XTB", "XTB"],
  ["DEGIRO", "DEGIRO"],
  ["ETORO", "eToro"],
  ["COINBASE", "Coinbase"],
  ["BINANCE", "Binance"],
  ["MBWAY", "MB Way"],
  // saúde, educação e outros
  ["FARMACIA", "Farmácia"],
  ["WELLS", "Wells"],
  ["CUF", "CUF"],
  ["COFAC", "Universidade Lusófona"],
  ["LUSOFONA", "Universidade Lusófona"],
  ["UNICUTZ", "Unicutz"],
  ["EDP", "EDP"],
  ["LEVANTAMENTO", "Levantamento"],
  ["EASYPAY", "Easypay"],
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function nomeDoDicionario(descricao: string | null): string | null {
  if (!descricao?.trim()) return null;
  const norm = normalizar(descricao);
  const frase = ` ${norm} `;
  const tokens = norm.split(" ");

  for (const [termo, nome] of NOMES) {
    if (termo.includes(" ")) {
      if (frase.includes(` ${termo} `)) return nome;
      continue;
    }
    if (termo.endsWith("*")) {
      const base = termo.slice(0, -1);
      if (tokens.some((t) => t.startsWith(base))) return nome;
      continue;
    }
    for (const token of tokens) {
      if (token === termo) return nome;
      if (token.length >= 5 && termo.startsWith(token)) return nome;
      if (termo.length >= 4 && token.startsWith(termo)) return nome;
    }
  }
  return null;
}

// "COMPRAS C.DEB HOTSHOT 1708008939" → "Hotshot"
function embelezar(descricao: string | null, contraparte: string | null): string {
  const base = contraparte?.trim() || descricao?.trim() || "Transação";
  const limpa = base
    .replace(/^(COMPRAS?\s+C\.?\s?DEB\.?|COMPRA|PAG(AMENTO)?\.?|TFI|TRF\.?|DD\.?)\s*/i, "")
    .replace(/\s+\d{7,}\s*$/, "") // números de referência no fim
    .trim();
  if (!limpa) return base;
  return limpa
    .split(/\s+/)
    .map((palavra) => {
      // siglas e códigos ficam como estão
      if (palavra.length <= 2 || /\d/.test(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Nome apresentável de uma transação, em cascata:
 * nome dado pelo utilizador → dicionário de nomes → embelezador.
 */
export function resolverNome(
  descricao: string | null,
  contraparte: string | null,
  nomesDoUtilizador: Map<string, string>
): string {
  const palavra = extrairPalavraChave(descricao);
  if (palavra) {
    const doUtilizador = nomesDoUtilizador.get(palavra);
    if (doUtilizador) return doUtilizador;
  }
  if (contraparte?.trim()) {
    const porContraparte = nomesDoUtilizador.get(contraparte.trim());
    if (porContraparte) return porContraparte;
  }
  return nomeDoDicionario(descricao) ?? embelezar(descricao, contraparte);
}

/**
 * Chave onde guardar o nome personalizado desta transação
 * (a mesma palavra-chave da aprendizagem de categorias).
 */
export function chaveDoNome(
  descricao: string | null,
  contraparte: string | null
): string | null {
  return extrairPalavraChave(descricao) ?? contraparte?.trim() ?? null;
}

/**
 * Palavras-chave a incluir na pesquisa: termos do dicionário e nomes do
 * utilizador cujo nome apresentável contém o texto pesquisado
 * (pesquisar "intermarché" encontra as "INTERMA" do banco).
 */
export function palavrasChaveParaPesquisa(
  pesquisa: string,
  nomesDoUtilizador: Map<string, string>
): string[] {
  const alvo = normalizar(pesquisa);
  if (alvo.length < 2) return [];
  const chaves = new Set<string>();

  // Prefixo curto: a BD guarda formas cortadas ("INTERMA"), por isso
  // procurar por "INTERM" apanha tanto o corte como o nome completo
  const prefixo = (termo: string) => termo.slice(0, 6).trim();

  for (const [termo, nome] of NOMES) {
    if (normalizar(nome).includes(alvo)) {
      chaves.add(prefixo(termo.replace(/\*$/, "")));
    }
  }
  for (const [chave, nome] of nomesDoUtilizador) {
    if (normalizar(nome).includes(alvo)) {
      chaves.add(prefixo(chave));
    }
  }
  return [...chaves].slice(0, 10);
}
