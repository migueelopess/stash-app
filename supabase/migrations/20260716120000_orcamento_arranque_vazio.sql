-- Arranque vazio: guardar o instante exato da criação do orçamento.
-- As transações do banco só trazem data (booking_date), sem hora, por isso
-- usamos o created_at da transação (momento em que entrou na app pelo sync)
-- para saber o que já existia quando o orçamento foi criado — esse histórico
-- nunca conta para ele. Assim um orçamento novo começa sempre a zero.
alter table public.budgets
  add column if not exists start_at timestamptz;

-- Existentes: o instante de criação (ou o início do dia âncora)
update public.budgets
  set start_at = coalesce(created_at, start_date::timestamptz)
  where start_at is null;

alter table public.budgets
  alter column start_at set default now();

alter table public.budgets
  alter column start_at set not null;
