-- Orçamentos semanais (semana de segunda a domingo)
alter table budgets drop constraint budgets_period_check;
alter table budgets add constraint budgets_period_check
  check (period in ('weekly', 'monthly', 'yearly'));
