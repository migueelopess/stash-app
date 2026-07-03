# App Gestão Financeira

App pessoal de gestão financeira do Miguel (estudante LEI, part-time IT). PWA mobile-first que sincroniza transações reais de CGD, BPI e Santander Totta via Enable Banking (PSD2, read-only). **Sem entrada manual de valores** — o banco é a fonte de verdade.

O plano completo, faseado, está em `PLANO.md`. Segue as fases por ordem; não saltes fases.

## Stack

Next.js 15+ (App Router, TS strict) · Tailwind v4 + shadcn/ui · Supabase (Postgres, Auth, RLS) · Enable Banking API · Recharts · Serwist (PWA) · Deploy: Vercel + Vercel Cron.

## Regras críticas

- `EB_PRIVATE_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são **server-only**. Nunca importar em componentes cliente. Todo o código Enable Banking vive em `src/lib/enablebanking/` e só é usado em Server Actions/Route Handlers.
- Transações são imutáveis no valor/data (vêm do banco). Só `category_id` é editável.
- Upserts de transações por `eb_transaction_id` (idempotente — o sync corre várias vezes).
- RLS ativa em todas as tabelas; testar com utilizador anónimo antes de dar por concluída qualquer migration.
- Valores monetários: `numeric(12,2)` na BD; nunca `float` em cálculos (usar inteiros de cêntimos ou decimal no TS).
- UI em português (PT-PT), EUR, formato `1 234,56 €`.

## Convenções

- Server Components por defeito; `"use client"` só quando necessário.
- Mutações via Server Actions; `/api/*` só para callback OAuth-like da Enable Banking e cron de sync.
- Estrutura: `src/app` (rotas), `src/lib` (supabase, enablebanking, rules-engine), `src/components`.
- Migrations SQL em `supabase/migrations/`, geridas com Supabase CLI.
- Commits pequenos por funcionalidade, mensagens em português.

## Comandos

```
npm run dev          # dev server
npm run build        # verificar build antes de cada commit importante
npx supabase db push # aplicar migrations
```

## Testar integração bancária

Usar primeiro o **mock ASPSP** da Enable Banking (sandbox) antes de ligar a CGD real. O limite PSD2 é ~4 chamadas não assistidas/dia por conta — não fazer sync em loop durante o desenvolvimento; usar dados mock ou o botão manual.
