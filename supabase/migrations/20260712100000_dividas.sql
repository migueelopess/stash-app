-- Dívidas pessoais: quem me deve / a quem devo (ligável a uma transação)
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  transaction_id uuid references transactions(id) on delete set null,
  person text not null,
  direction text not null check (direction in ('a_receber', 'a_pagar')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  settled boolean not null default false,
  created_at timestamptz default now(),
  settled_at timestamptz
);

create index idx_debts_user on debts (user_id, settled);

alter table debts enable row level security;

create policy "dividas_proprias" on debts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
