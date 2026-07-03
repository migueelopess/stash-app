-- Seed de categorias globais (user_id null — visíveis para todos os
-- utilizadores autenticados, não editáveis por RLS)

insert into categories (user_id, name, kind, icon, color) values
  -- Ganhos
  (null, 'Salário',                'income',  'banknote',         '#16a34a'),
  (null, 'Tarefas',                'income',  'hand-coins',       '#22c55e'),
  (null, 'Outros ganhos',          'income',  'circle-plus',      '#4ade80'),
  -- Gastos
  (null, 'Alimentação',            'expense', 'shopping-cart',    '#f97316'),
  (null, 'Transportes',            'expense', 'bus',              '#3b82f6'),
  (null, 'Subscrições',            'expense', 'repeat',           '#8b5cf6'),
  (null, 'Lazer',                  'expense', 'gamepad-2',        '#ec4899'),
  (null, 'Educação',               'expense', 'graduation-cap',   '#06b6d4'),
  (null, 'Transferências próprias','expense', 'arrow-left-right', '#64748b'),
  (null, 'Outros',                 'expense', 'circle-ellipsis',  '#94a3b8');
