# kiv-console

**K.I.V. — Kivaro Intelligence Vectoring.** The unified operating system for
Kivaro AI: a real-time command platform that runs the firm from a single
interface.

Built incrementally, module by module:

1. Foundation (this state) — Next.js 16 + Cache Components, Tailwind,
   shadcn/ui, Supabase schema, CI.
2. Company Dashboard — Command Center, Team Board, User Management, Kanban
   Client Portal.
3. Calendar — Google Calendar OAuth.
4. Intel Hub — crypto/equities/forex/commodities, watchlists, price alerts.
5. News feed — curated Fintech/AI/Alt-Investment feed.
6. Research — AI-written daily brief (Claude API), on a Vercel Cron job.
7. Overview (home page) — assembles everything above; placeholders for
   Ultron security status and ALE activity until those systems exist.
8. Auth/roles hardening.
9. CAD Engine (stretch, deprioritized).

## Develop

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials once the project exists
npm run dev                  # http://localhost:3000
npm run ci                   # lint + typecheck + test + build
```

## Database

Schema lives in `supabase/migrations/`. Once a Supabase project exists, apply
it either via the Supabase SQL editor (paste the migration file) or via the
Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

## Deploy

Deploys to Render — <https://kiv-console.onrender.com>, configured by
`render.yaml`. The service is connected to this GitHub repo and auto-deploys
every push to `main`; set the environment variables from `.env.example` in
the service's dashboard (they are secrets, so the Blueprint deliberately
declares none). To rebuild the current commit without pushing, use the
service's Deploy Hook (Settings -> Deploy Hook) or Manual Deploy.

The scheduled jobs in `.github/workflows/` POST to this same host, so if the
URL ever changes again, update those four workflow files alongside it.
