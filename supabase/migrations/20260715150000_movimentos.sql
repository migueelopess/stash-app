-- "Movimentos": transações que vão e voltam (reembolsos, transferências entre
-- contas próprias) e que, por isso, não devem contar como gasto nem ganho.
-- Marcadas manualmente pelo utilizador depois da categorização automática.
-- Continuam a ser dinheiro real na conta, por isso entram na evolução do saldo.
alter table public.transactions
  add column if not exists is_movement boolean not null default false;

-- Filtragem rápida nas agregações que excluem movimentos
create index if not exists transactions_is_movement_idx
  on public.transactions (is_movement)
  where is_movement = true;
