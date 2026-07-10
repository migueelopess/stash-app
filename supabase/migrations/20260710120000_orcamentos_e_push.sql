-- Orçamentos: limite de gastos por categoria (ou global, category_id null),
-- mensal ou anual. alert_level/alert_period evitam notificações duplicadas.
create table budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  category_id uuid references categories(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  period text not null default 'monthly' check (period in ('monthly', 'yearly')),
  alert_level int not null default 0,   -- 0 | 80 | 100 (último alerta enviado)
  alert_period text,                    -- '2026-07' (mensal) ou '2026' (anual)
  created_at timestamptz default now()
);

-- Um orçamento por categoria (e um global) por utilizador
create unique index budgets_user_category_unique
  on budgets (user_id, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table budgets enable row level security;

create policy "orcamentos_proprios" on budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Subscrições de notificações push (Web Push / PWA)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "subscricoes_proprias" on push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
