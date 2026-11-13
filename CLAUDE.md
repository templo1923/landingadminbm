# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Next.js on localhost:3000)
npm run build     # Production build
npm run start     # Run production build
npm run lint      # ESLint with Next.js/TypeScript config
```

No test suite exists yet (acknowledged debt). One-off DB/API checks live in `scripts/`.

## Stack

- **Next.js 16 App Router** with TypeScript strict mode and path alias `@/*` → `./src/*`
- **Supabase** (PostgreSQL + Auth + RLS) — all multi-tenancy is enforced via Row-Level Security
- **Tailwind CSS v4** — dark-mode-first, emerald accent (`#10b981`), glass-morphic dashboard UI
- **Meta Graph API v22.0** — WhatsApp Business Cloud API, Embedded Signup OAuth flow

## Architecture

### Two Supabase clients (critical distinction)

`src/utils/supabase/server.ts` exports two factories:

- `createClient()` — uses anon key + cookie session. Use for all user-facing data access; RLS applies.
- `createAdminClient()` — uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS entirely. Use **only** in API routes that process webhooks or store OAuth tokens on behalf of users (no session context).

### Data mutations: Server Actions, not REST

All customer and auth operations go through `src/app/actions/` (`auth.ts`, `customers.ts`, `whatsapp.ts`). These are Next.js `'use server'` actions called directly from components — no intermediate REST layer.

### API routes (three only)

| Route | Purpose |
|---|---|
| `POST /api/whatsapp/exchange-token` | Receives Meta OAuth `code`, exchanges for long-lived token, stores in `whatsapp_connections` |
| `GET+POST /api/whatsapp/webhook` | Webhook ingestion from Meta — must return 200/202 fast; upserts on `message_id` for idempotency |
| `GET+POST /api/meta/deauthorize` | Signed-request callback when user removes the app; validates HMAC then purges their data |

### Database schema (key rules)

- **profiles** — 1:1 with `auth.users`, auto-created on signup via DB trigger
- **whatsapp_connections** — one row per tenant, holds the long-lived access token and WABA/phone IDs
- **customers** — soft-delete only (`deleted_at` timestamp). Three lifecycle states: active, paused (`is_active = false`), deleted (`deleted_at IS NOT NULL`)
- **whatsapp_message_events** — append-only webhook log; upsert on `message_id`

**Critical business rule**: WhatsApp reminders must only target customers where `payment_status IN ('pending', 'overdue') AND is_active = true AND deleted_at IS NULL`.

### Auth & middleware

`src/middleware.ts` calls `updateSession()` (from `src/utils/supabase/middleware.ts`) on every request to keep the Supabase session cookie fresh. It guards `/dashboard/*` and redirects authenticated users away from `/login` and `/signup`.

### Customer import flow

`/dashboard/clients` — dropzone → column mapping wizard → E.164 phone validation (`libphonenumber-js`) → server action upsert. Two modes: **Append** (new records only) and **Overwrite** (replaces all). Soft-deleted contacts are resurrected if reimported.

## Environment Variables

```
NEXT_PUBLIC_FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
WHATSAPP_WEBHOOK_VERIFY_TOKEN
NEXT_PUBLIC_OAUTH_REDIRECT_URI
```

No `.env.example` exists — use this list. The webhook verify token is a custom string you set both here and in Meta's developer portal.

## Key docs

- `AI_CONTEXT.md` — developer handoff document with implementation details
- `META_APP_REVIEW.md` — guide for the Meta App Review submission
- `docs/ESTADO_DEL_SISTEMA.md` — known tech debt and system state
- `supabase_setup.sql` — full schema with RLS policies (source of truth for DB)
