-- Categorias globais extra, pedidas pelos padrões reais de gastos
-- (farmácias, lojas, contas da casa, barbeiro...)
insert into categories (user_id, name, kind, icon, color) values
  (null, 'Compras',           'expense', 'shopping-bag', '#d946ef'),
  (null, 'Saúde',             'expense', 'heart-pulse',  '#ef4444'),
  (null, 'Casa',              'expense', 'house',        '#0ea5e9'),
  (null, 'Cuidados pessoais', 'expense', 'scissors',     '#14b8a6');
