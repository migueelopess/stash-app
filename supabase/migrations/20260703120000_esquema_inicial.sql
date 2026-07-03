-- Fase 1: esquema inicial — ligações bancárias, contas, categorias,
-- transações, regras de categorização e metas. RLS em todas as tabelas.

-- Ligações bancárias (1 por banco autorizado)
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  bank_name text not null,               -- 'CGD' | 'BPI' | 'Santander Totta'
  session_id text not null,              -- Enable Banking session
  valid_until timestamptz not null,      -- fim da autorização PSD2
  status text not null default 'active', -- active | expired | revoked
  created_at timestamptz default now()
);

-- Contas dentro de cada ligação
create table accounts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references bank_connections(id) on delete cascade,
  eb_account_uid text not null unique,   -- uid da Enable Banking
  name text,
  iban text,
  currency text default 'EUR',
  balance numeric(12,2),
  balance_updated_at timestamptz
);

-- Categorias (seed global com user_id null + personalizáveis por utilizador)
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,                    -- Salário, Tarefas, Alimentação, ...
  kind text not null check (kind in ('income', 'expense')),
  icon text,
  color text
);

-- Transações (fonte de verdade: banco; valor/data nunca editáveis)
create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  eb_transaction_id text unique,         -- dedupe no re-sync
  booking_date date not null,
  amount numeric(12,2) not null,         -- >0 crédito, <0 débito
  currency text default 'EUR',
  description text,
  counterparty text,
  category_id uuid references categories(id),
  categorized_by text not null default 'none', -- rule | manual | none
  raw jsonb,                             -- payload original da Enable Banking
  created_at timestamptz default now()
);

-- Regras de categorização automática
create table categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  priority int not null default 100,
  match_field text not null check (match_field in ('description', 'counterparty', 'amount')),
  match_type text not null check (match_type in ('contains', 'equals', 'regex', 'between')),
  match_value text not null,
  category_id uuid not null references categories(id)
);

-- Metas de poupança (fase 6)
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  target_amount numeric(12,2) not null,
  target_date date,
  created_at timestamptz default now()
);

-- Índices para as consultas mais frequentes
create index idx_transactions_account_date on transactions (account_id, booking_date desc);
create index idx_transactions_category on transactions (category_id);
create index idx_accounts_connection on accounts (connection_id);
create index idx_rules_user_priority on categorization_rules (user_id, priority);

-- RLS: cada utilizador só vê os seus dados; tabelas filhas via join
alter table bank_connections enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table categorization_rules enable row level security;
alter table goals enable row level security;

create policy "ligacoes_proprias" on bank_connections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "contas_proprias" on accounts
  for all to authenticated
  using (exists (
    select 1 from bank_connections bc
    where bc.id = connection_id and bc.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from bank_connections bc
    where bc.id = connection_id and bc.user_id = (select auth.uid())
  ));

-- Categorias globais (user_id null) são visíveis; só as próprias são editáveis
create policy "categorias_visiveis" on categories
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "categorias_proprias_insert" on categories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "categorias_proprias_update" on categories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categorias_proprias_delete" on categories
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "transacoes_proprias" on transactions
  for all to authenticated
  using (exists (
    select 1 from accounts a
    join bank_connections bc on bc.id = a.connection_id
    where a.id = account_id and bc.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from accounts a
    join bank_connections bc on bc.id = a.connection_id
    where a.id = account_id and bc.user_id = (select auth.uid())
  ));

create policy "regras_proprias" on categorization_rules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "metas_proprias" on goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
