# App Gestão Financeira

PWA pessoal de gestão financeira. Sincroniza transações reais de CGD, BPI e Santander Totta via Enable Banking (PSD2, read-only) — sem entrada manual de valores.

Ver [PLANO.md](PLANO.md) para o plano completo de implementação e [CLAUDE.md](CLAUDE.md) para as convenções do projeto.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 + shadcn/ui · Supabase · Enable Banking API · Serwist (PWA) · Vercel

## Desenvolvimento

```bash
cp .env.example .env.local   # preencher com as chaves reais
npm install
npm run dev                  # http://localhost:3000
npm run build                # verificar antes de commits importantes
```
