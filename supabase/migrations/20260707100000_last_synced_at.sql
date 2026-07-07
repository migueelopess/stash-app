-- Timestamp da última sincronização de cada ligação (mostrado na UI)
alter table bank_connections
  add column last_synced_at timestamptz;
