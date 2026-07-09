-- Cores distintas para as categorias de ganhos (eram 3 verdes quase iguais —
-- ilegível num donut, sobretudo para daltónicos). Paleta validada (CVD ≥ 3:1
-- de contraste em claro e escuro).
update categories set color = '#d97706' where name = 'Tarefas' and user_id is null;
update categories set color = '#8b5cf6' where name = 'Outros ganhos' and user_id is null;
update categories set color = '#0d9488' where name = 'Transferências recebidas' and user_id is null;
