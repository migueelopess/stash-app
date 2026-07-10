-- Nomes personalizados de comerciantes: o utilizador dá um nome bonito a
-- uma transação ("Intermarché" para "C.DEB INTERMA") e todas as transações
-- com a mesma palavra-chave passam a mostrá-lo (só apresentação).
create table merchant_names (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  match_value text not null,   -- palavra-chave extraída ou contraparte
  display_name text not null,
  created_at timestamptz default now(),
  unique (user_id, match_value)
);

alter table merchant_names enable row level security;

create policy "nomes_proprios" on merchant_names
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
