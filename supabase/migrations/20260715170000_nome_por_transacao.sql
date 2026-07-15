-- Nome específico de UMA transação (exceção pontual), sem afetar o nome
-- global do comerciante. Ex.: gasóleo comprado no Intermarché — só aquela
-- transação leva outro nome/categoria, as restantes do Intermarché ficam na
-- mesma. Tem prioridade sobre o nome aprendido/dicionário na apresentação.
alter table public.transactions
  add column if not exists custom_name text;
