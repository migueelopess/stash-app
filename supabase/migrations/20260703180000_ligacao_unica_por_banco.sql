-- Uma ligação por banco e por utilizador — permite upsert idempotente
-- no callback (renovar substitui a sessão em vez de duplicar).
alter table bank_connections
  add constraint bank_connections_user_bank_unique unique (user_id, bank_name);
