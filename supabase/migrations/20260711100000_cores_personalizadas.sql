-- Cores personalizadas por utilizador para qualquer categoria (inclui as
-- base, que são partilhadas). Override aplicado só na apresentação.
create table category_colors (
  user_id uuid not null references auth.users(id),
  category_id uuid not null references categories(id) on delete cascade,
  color text not null,
  primary key (user_id, category_id)
);

alter table category_colors enable row level security;

create policy "cores_proprias" on category_colors
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
