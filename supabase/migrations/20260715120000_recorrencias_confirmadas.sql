-- Comerciantes que o utilizador confirmou serem gastos fixos a partir de uma
-- transação ("marcar como gasto fixo"). Aparecem sempre nos gastos fixos,
-- com valor/cadência derivados do histórico real. Inverso das exclusões.
create table if not exists public.recurring_confirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chave text not null,
  created_at timestamptz not null default now(),
  unique (user_id, chave)
);

alter table public.recurring_confirmations enable row level security;

create policy "recorrencias_confirmadas_proprias"
  on public.recurring_confirmations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
