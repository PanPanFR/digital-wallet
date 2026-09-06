# PRE-PLAN: Finance Tracker v2 (SvelteKit Rewrite)

Shared context for all plans under `plan/`. Read this before executing any plan file.

## Project Overview

Personal finance tracker, single-user, master-password protected. Rewrite of
https://github.com/PanPanFR/finance-tracker (Next.js 15 + React 19) into
SvelteKit. Feature parity minus OCR receipt scanning (dropped).

Spec: `docs/specs/2026-09-03-svelte-rewrite-design.md` — the plan argues from
this spec; read both.

## Stack

- SvelteKit (Svelte 5, runes) + TypeScript
- Tailwind CSS v4
- Cloudflare Workers (static assets + API in one Worker), adapter-cloudflare
- Cloudflare D1 (SQLite) — binding name `DB`, schema `schema.sql` (unchanged from old repo)
- zod (server-side validation), lucide-svelte (icons)
- vitest (unit tests), npm (package manager)
- Node.js 20+

## Structure (target)

```
finance-tracker-v2/
├── src/
│   ├── hooks.server.ts        # auth guard + 401 JSON for /api/*
│   ├── lib/server/            # db.ts, auth.ts, ai.ts (server-only)
│   ├── lib/components/        # Svelte components
│   ├── lib/stores.svelte.ts   # toast + theme (runes)
│   ├── routes/                # dashboard, transactions, analytics, copilot, login, settings, api/ai/*
│   ├── app.css, app.html
├── static/                    # manifest.json, sw.js, icons
├── wrangler.jsonc             # assets, D1 binding, secrets
├── schema.sql                 # unchanged from old repo
└── docs/specs/                # design spec
```

## Conventions

- File contents in English. UI copy in Indonesian (matches old app).
- Server data access only in `src/lib/server/*` — never import D1 in components.
- CRUD via SvelteKit form actions; AI endpoints are JSON `+server.ts`.
- Client state limited to toast + theme via runes; no state libraries.
- Money: `amount REAL` in D1 (existing schema); display formatting via `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- Dates stored as UTC `datetime('now')` strings (existing schema).

## Existing Decisions (from brainstorm, 2026-09-03)

1. Motivation: lighter stack + overall simplification; feature parity except OCR.
2. SvelteKit over SPA + separate backend.
3. Cloudflare Workers over Pages (Workers is CF's forward platform; drops `@cloudflare/next-on-pages` workaround).
4. Idiomatic port (Option B): form actions, load functions, server hooks — no port of `client-api.ts`, no client fetch for CRUD.
5. Database NOT migrated: same D1 database, same schema; existing data and master password keep working (`auth.ts` ported verbatim, format-compatible).
6. Dropped: OCR/Tesseract.js, `client-api.ts`.
7. No chart library — CSS bars like the old app.

## Old-Repo Source (porting reference)

Fetch raw files when porting:
`https://raw.githubusercontent.com/PanPanFR/finance-tracker/master/<path>`

Key files to port:
- `src/lib/auth.ts` — HMAC sessions + password hash (port verbatim)
- `src/lib/db.ts` — D1 queries
- `src/lib/ai.ts`, `src/lib/aiParser.ts`, `src/lib/aiReport.ts` — Gemini logic (merge into one `ai.ts`)
- `src/components/{Toast,ConfirmModal,TransactionForm,Skeleton,ThemeToggle,Navigation}.tsx`
- `src/hooks/useModalAccessibility.ts` → Svelte action
- `src/app/globals.css` — port relevant parts only (41 KB, much is Next-specific)
- `.github/workflows/deploy.yml`, `schema.sql`

## Constraints

- Secrets: `SESSION_SECRET`, `GOOGLE_API_KEY` — server-only, never in client bundles.
- All routes except `/login` and static assets require a valid session; `/api/*` returns 401 JSON instead of redirect.
- PWA: installable, offline shell only; data requires connectivity.
- Free-tier friendly: no paid services, no Workbox.
