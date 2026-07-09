-- Nova categoria para trading/corretoras/wallets (Revolut, Trading212...)
insert into categories (user_id, name, kind, icon, color) values
  (null, 'Investimentos', 'expense', 'trending-up', '#6366f1');

-- "Transferências próprias" passa a "Transferências" — cobre também
-- MB Way e transferências para outras pessoas
update categories
  set name = 'Transferências'
  where name = 'Transferências próprias' and user_id is null;
