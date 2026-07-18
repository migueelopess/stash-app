<div align="center">
  <img src="public/icon-512.png" width="96" alt="Stash logo" />

  # Stash

  **Personal finance PWA with real bank synchronization — zero manual entry.**

  Connects to real Portuguese bank accounts (CGD, BPI, Santander Totta) through the
  [Enable Banking](https://enablebanking.com) PSD2 API, categorizes every transaction
  automatically, and turns raw statements into insights: spending analysis,
  recurring-charge detection, budgets, and a 30-day balance forecast.
</div>

## Features

- **Automatic bank sync** — read-only PSD2 (AIS) connection; transactions and balances land in the app daily via cron, deduplicated and idempotent. The app can never move money.
- **Smart categorization** — a rule engine (priority-ordered `contains`/`regex`/`amount` matchers) categorizes new transactions on sync. Manual corrections teach the app: it derives a precise rule from the transaction and re-applies it to the rest of the history.
- **Merchant identity** — bank descriptions like `COMPRAS C.DEB CONTINENTE MAT` become "Continente"; person-to-person transfers are keyed by the full name so two friends named Miguel stay two different people. Custom display names, per-merchant history pages.
- **Recurring detection** — subscriptions and fixed expenses (and recurring income) are detected from cadence and value stability, with median-based tolerance for price changes. Powers "upcoming charges", safe-to-spend per day, and a 30-day balance forecast chart.
- **Analysis** — month-vs-month comparisons that are fair (month-to-date against the same day range), category and merchant drill-downs, weekday spending habits, fixed-vs-variable split.
- **Budgets** — weekly/monthly/yearly, anchored to the creation moment so a new budget always starts empty.
- **Movements** — money that goes and comes back (reimbursements, transfers between own accounts) can be excluded from gains/expenses everywhere while staying in the balance.
- **PWA** — installable, offline-aware shell, push notifications for budget alerts and PSD2 renewal warnings, animated splash, per-route loading skeletons, optimistic bottom navigation.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4 + shadcn/ui + Recharts |
| Database & Auth | Supabase (Postgres, Row Level Security, Supabase Auth) |
| Bank data | Enable Banking API (PSD2 AIS, JWT RS256 client) |
| PWA | Serwist (service worker, precache, push) |
| Hosting | Vercel (+ Vercel Cron for the daily sync) |

## Architecture

```
Phone / desktop (PWA)
        │
        ▼
Vercel ── Server Actions / Route Handlers
        │        │
        │        ├── Supabase (Postgres + Auth + RLS)
        │        │
        │        └── Enable Banking API ──► CGD / BPI / Santander (PSD2)
        │
        └── Vercel Cron (daily sync)
```

Security model: the Enable Banking private key and the Supabase service role key live
only in server-side environment variables; every table is protected by RLS; the sync
endpoint is guarded by a secret; auth-session JWTs are verified locally in the proxy
(asymmetric keys) so no request waits on a network round-trip to the auth server.

## Development

```bash
cp .env.example .env.local   # fill in your own keys
npm install
npm run dev                  # http://localhost:3000
npm run build                # production build (webpack, required by Serwist)
```

Database migrations live in `supabase/migrations` and are applied with the Supabase CLI.

See [PLANO.md](PLANO.md) for the original implementation plan (in Portuguese) and
[CLAUDE.md](CLAUDE.md) for project conventions.

> **Note:** this is a personal single-user project. Enable Banking's Restricted
> Production mode only allows connecting the developer's own accounts — opening it to
> other users would require a commercial agreement.
