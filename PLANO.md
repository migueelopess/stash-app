# Plano de Implementação — Stash

> Web app PWA mobile-first que sincroniza automaticamente as transações bancárias reais do utilizador (CGD, BPI, Santander Totta) via Enable Banking. Zero entrada manual de valores.

## 1. Visão

- **Objetivo:** ver ganhos e gastos reais, categorizados automaticamente, com dashboard de saldo, tendências e poupança.
- **Princípio:** a app só **lê** dados bancários (AIS/PSD2). Nunca movimenta dinheiro.
- **Utilizador único** (uso pessoal), mas com auth real — os dados são sensíveis.

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15+ (App Router, Server Components, Server Actions) |
| Linguagem | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Gráficos | Recharts |
| BD + Auth | Supabase (Postgres + Supabase Auth + RLS) |
| Dados bancários | Enable Banking API (Restricted Production, gratuito p/ contas próprias) |
| Deploy | Vercel (+ Vercel Cron para sync diário) |
| PWA | `@serwist/next` (service worker + manifest, instalável no telemóvel) |

## 3. Arquitetura

```
Telemóvel/PC (PWA Next.js)
        │
        ▼
Vercel ── Server Actions / Route Handlers
        │        │
        │        ├── Supabase (Postgres + Auth + RLS)
        │        │
        │        └── Enable Banking API ──► CGD / BPI / Santander (PSD2)
        │
        └── Vercel Cron (sync diário 07:00)
```

- A chave privada da Enable Banking vive **só no servidor** (env var na Vercel).
- Fluxo de ligação a um banco: app pede URL de autorização → redirect para o banco → o utilizador autentica na app do banco (Caixadirecta/BPI/Santander) → callback com `code` → criar sessão Enable Banking → guardar `session_id` + contas.
- Sessões PSD2 duram até 180 dias (varia por banco) → app avisa quando faltar pouco para renovar.
- **Limite PSD2:** ~4 chamadas não assistidas/dia por conta → 1 sync via cron + sync manual quando a app está aberta.

## 4. Esquema da Base de Dados (Supabase)

```sql
-- Ligações bancárias (1 por banco autorizado)
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  bank_name text not null,              -- 'CGD' | 'BPI' | 'Santander Totta'
  session_id text not null,             -- Enable Banking session
  valid_until timestamptz not null,     -- fim da autorização PSD2
  status text not null default 'active',-- active | expired | revoked
  created_at timestamptz default now()
);

-- Contas dentro de cada ligação
create table accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references bank_connections(id) on delete cascade,
  eb_account_uid text not null unique,  -- uid da Enable Banking
  name text,
  iban text,
  currency text default 'EUR',
  balance numeric(12,2),
  balance_updated_at timestamptz
);

-- Categorias (seed inicial + personalizáveis)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,                   -- Salário, Tarefas, Alimentação, ...
  kind text not null,                   -- income | expense
  icon text, color text
);

-- Transações (fonte de verdade: banco; nunca editáveis no valor)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  eb_transaction_id text unique,        -- dedupe no re-sync
  booking_date date not null,
  amount numeric(12,2) not null,        -- >0 crédito, <0 débito
  currency text default 'EUR',
  description text,
  counterparty text,
  category_id uuid references categories(id),
  categorized_by text default 'none',   -- rule | manual | none
  raw jsonb,                            -- payload original da Enable Banking
  created_at timestamptz default now()
);

-- Regras de categorização automática
create table categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  priority int not null default 100,
  match_field text not null,            -- description | counterparty | amount
  match_type text not null,             -- contains | equals | regex | between
  match_value text not null,
  category_id uuid not null references categories(id)
);

-- Metas de poupança (opcional, fase 6)
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  target_amount numeric(12,2) not null,
  target_date date,
  created_at timestamptz default now()
);

-- RLS em TODAS as tabelas: user_id = auth.uid() (via join nas tabelas filhas)
```

## 5. Integração Enable Banking (detalhe)

1. **Registo:** conta em enablebanking.com → criar aplicação → obter `application_id` + gerar par de chaves; a **chave privada** fica em `EB_PRIVATE_KEY` (env var).
2. **Auth da API:** cada request leva JWT RS256 assinado com a chave privada (`kid` = application_id, expiração curta).
3. **Endpoints usados:**
   - `GET /aspsps?country=PT` — listar bancos (CGD, BPI, Santander Totta)
   - `POST /auth` — iniciar autorização (redirect_url = `/api/callback`)
   - `POST /sessions` — trocar `code` por sessão + lista de contas
   - `GET /accounts/{uid}/balances` e `GET /accounts/{uid}/transactions` (paginado, `date_from`)
4. **Sync (route handler `/api/sync`, chamado por Vercel Cron + botão manual):**
   - Para cada conta ativa: buscar transações desde a última sincronizada → upsert por `eb_transaction_id` → aplicar regras de categorização às novas → atualizar saldo.
   - Marcar ligações com `valid_until` próximo (<14 dias) para mostrar aviso de renovação.

## 6. Categorização automática

- **Seed de categorias:** Salário, Tarefas (casa), Outros ganhos / Alimentação, Transportes, Subscrições, Lazer, Educação, Transferências próprias, Outros.
- **Regras iniciais (exemplos):**
  - `description contains "MB WAY" AND amount > 0 AND counterparty = <contraparte conhecida>` → Tarefas
  - crédito recorrente mensal do empregador → Salário
  - `description contains "CONTINENTE|PINGO DOCE|LIDL"` → Alimentação
  - `description contains "SPOTIFY|NETFLIX|YOUTUBE"` → Subscrições
- Transação sem regra → fica "por categorizar"; ao categorizar manualmente, a app **sugere criar regra** a partir dessa transação (aprende com o uso).

## 7. Fases de Implementação (para executar com Claude Code)

### Fase 0 — Setup (½ dia)
- `create-next-app` (TS, Tailwind, App Router) + shadcn/ui + serwist (PWA)
- Projeto Supabase, ligar `@supabase/ssr`, configurar env vars locais
- Repo Git + deploy inicial na Vercel

### Fase 1 — Auth + BD (½ dia)
- Supabase Auth (email + password ou magic link; utilizador único)
- Migrations do esquema (secção 4) + RLS + seed de categorias
- Layout base mobile-first (bottom nav: Dashboard, Transações, Contas, Definições)

### Fase 2 — Ligação bancária (1-2 dias)
- Cliente Enable Banking (JWT RS256, server-only)
- Fluxo: escolher banco → redirect → callback → criar sessão → gravar ligação + contas
- Página "Contas": estado de cada ligação, validade, botão renovar
- **Testar primeiro com o mock ASPSP da Enable Banking**, só depois CGD real

### Fase 3 — Sync de transações (1 dia)
- `/api/sync` com upsert idempotente + Vercel Cron diário
- Botão "Sincronizar agora" + timestamp da última sync
- Lista de transações: infinite scroll, filtros (conta, categoria, mês, ganho/gasto)

### Fase 4 — Categorização (1 dia)
- Motor de regras (ordenadas por prioridade) aplicado no sync
- UI para categorizar pendentes + "criar regra a partir desta transação"
- Gestão de regras e categorias em Definições

### Fase 5 — Dashboard (1-2 dias)
- Saldo total agregado (3 bancos) + variação do mês
- Ganhos vs. gastos por mês (barras), gastos por categoria (donut), evolução do saldo (linha)
- Cartões: "Salário este mês", "Tarefas este mês", "Taxa de poupança"

### Fase 6 — Polimento (1 dia)
- Metas de poupança, avisos de renovação PSD2, estados vazios, dark mode
- PWA final: manifest, ícones, splash, teste de instalação no telemóvel
- Verificação de segurança: RLS testada, nenhuma chave no cliente, headers

## 8. Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # só server, para o cron
EB_APPLICATION_ID=
EB_PRIVATE_KEY=                   # PEM, só server
EB_REDIRECT_URL=https://<app>.vercel.app/api/callback
CRON_SECRET=                      # proteger /api/sync
```

## 9. Riscos e mitigações

- **Renovação PSD2 (90–180 dias):** inevitável por lei → aviso na app + email.
- **Limite de 4 syncs não assistidos/dia:** 1 cron diário chega; sync manual conta como "assistido".
- **Restricted Production:** só contas do próprio — perfeito para uso pessoal; para abrir a app a terceiros seria preciso contrato com a Enable Banking.
- **Dados sensíveis:** RLS obrigatória, `raw` jsonb nunca exposto no cliente, segredos só em variáveis de ambiente (nunca no repo).
