-- Orçamentos ancorados ao dia de criação: a janela (semanal/mensal/anual)
-- passa a rolar a partir de start_date em vez de se alinhar ao calendário.
-- Ex.: orçamento semanal criado a uma quarta → semana = quarta a terça.
alter table public.budgets
  add column if not exists start_date date;

-- Existentes: ancorar na data em que foram criados
update public.budgets
  set start_date = coalesce(created_at::date, current_date)
  where start_date is null;

alter table public.budgets
  alter column start_date set default current_date;

alter table public.budgets
  alter column start_date set not null;
