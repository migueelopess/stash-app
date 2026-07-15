-- Comerciantes que o utilizador marcou como "nunca é gasto fixo"
create table recurring_exclusions (
  user_id uuid not null references auth.users(id),
  chave text not null,
  created_at timestamptz default now(),
  primary key (user_id, chave)
);

alter table recurring_exclusions enable row level security;

create policy "exclusoes_proprias" on recurring_exclusions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
