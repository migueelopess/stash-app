-- Gastos fixos adicionados manualmente pelo utilizador (além dos detetados)
create table recurring_manual (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  cadence text not null check (cadence in ('weekly', 'monthly', 'yearly')),
  category_id uuid references categories(id) on delete set null,
  next_date date,
  created_at timestamptz default now()
);

alter table recurring_manual enable row level security;

create policy "recorrencias_manuais_proprias" on recurring_manual
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
