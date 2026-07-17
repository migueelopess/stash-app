// Repõe a password de um utilizador da Stash (admin, via service role).
// Correr da raiz do projeto: node scripts/repor-password.mjs
// O script pergunta o email e a nova password — nada fica guardado.
import { createInterface } from "node:readline/promises";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Ler .env.local (o Node não o carrega sozinho fora do Next)
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
const email = (await rl.question("Email da conta: ")).trim();
const password = (await rl.question("Nova password (mín. 6 caracteres): ")).trim();
rl.close();

if (!email.includes("@") || password.length < 6) {
  console.error("Email inválido ou password demasiado curta.");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

// Encontrar o utilizador pelo email
const { data, error: erroLista } = await supabase.auth.admin.listUsers();
if (erroLista) {
  console.error("Erro a listar utilizadores:", erroLista.message);
  process.exit(1);
}
const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`Não existe nenhum utilizador com o email ${email}.`);
  console.error("Emails existentes:", data.users.map((u) => u.email).join(", "));
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
if (error) {
  console.error("Erro a atualizar a password:", error.message);
  process.exit(1);
}
console.log(`✓ Password de ${email} atualizada. Já podes entrar na app.`);
