// Cria um novo utilizador da Stash (admin, via service role).
// Correr da raiz do projeto: node scripts/criar-utilizador.mjs
// Pergunta o email e a password — a pessoa escolhe a própria password,
// nada fica guardado fora da base de dados.
import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("Não encontrei NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question("Email do novo utilizador: ")).trim();
const password = (await rl.question("Password (mín. 6 caracteres): ")).trim();
rl.close();

if (!email.includes("@") || password.length < 6) {
  console.error("Email inválido ou password demasiado curta.");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

// email_confirm: true → pode entrar já, sem passo de confirmação por email
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  if (/already|exist/i.test(error.message)) {
    console.error(`Já existe uma conta com o email ${email}.`);
  } else {
    console.error("Erro a criar o utilizador:", error.message);
  }
  process.exit(1);
}

console.log(`✓ Conta criada para ${email} (id ${data.user.id}).`);
console.log("Já pode entrar em https://stashpt.vercel.app com este email e password.");
