# Implementation Plan: React Foundation + Hono API

## Objective

Replace the SvelteKit full-stack shell with a Vite+React SPA served by one Cloudflare Worker whose Hono app exposes a JSON API over the unchanged D1 database. Freezes the API contract that all UI plans build on.

## Scope

In: repo layout (`web/` SPA + `worker/` Hono entry + `shared/`), Hono REST API with cookie-session guard, logic-unchanged port of `src/lib/server/*`, frozen endpoint contract, ported vitest suite (fake-Db first), `wrangler.jsonc` re-point, SPA fallback routing, npm scripts.
Out: page UI beyond a shell + login form (plans 2–3), charts, copilot UI, theme polish. No schema change — `schema.sql`/`migrations/` untouched.

## Context

Stack: Vite 7 + React 19 + TS strict + React Router 7 (BrowserRouter) + TanStack Query 5 + Tailwind v4 (via `@tailwindcss/vite`, no config file) + Hono v4 + zod v3 + vitest. D1 binding `DB` (`digital-wallet-db`) unchanged.
Non-negotiable rules carried over: balances computed via `SUM(CASE …)` (never stored); all SQL in one module, `D1Database` first arg; zod server-side single source in `shared/`; cookie `dw_session` HMAC-SHA256 7-day guard (`/api/*` → JSON 401, SPA redirects to `/login` client-side); AI provider precedence body-override → stored provider → env; backup JSON version 1 shape unchanged.
Decisions: one `package.json`; `web/` builds to `dist/`; wrangler `main: worker/index.ts`, `assets: { directory: ./dist, not_found_handling: single-page-application }`. `src/` (SvelteKit) stays untouched until plan 3 deletes it — plan 2 uses the old `+page.svelte` files as visual spec.

## Dependencies

Node 20+, wrangler 4, existing local D1 state in `.wrangler/state/`. New deps only: `hono`, `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `recharts` (used in plan 3). Svelte deps removed in plan 3, not here.

## Files / Areas Likely Affected

- Create: `worker/index.ts` (Hono app + auth middleware + route mount), `worker/routes/auth.ts|wallets.ts|transactions.ts|debts.ts|analytics.ts|ai.ts|backup.ts|settings.ts`, `worker/db.ts`, `worker/auth.ts`, `worker/session.ts`, `worker/ai.ts`, `worker/aiProviders.ts`, `shared/validation.ts`, `shared/types.ts`, `web/index.html`, `web/src/main.tsx`, `web/src/app.tsx` (router + QueryClient), `web/src/api/client.ts` (`fetch` wrapper, `credentials: include`, 401 → `/login`), `web/src/pages/Login.tsx`.
- Port (logic unchanged): `src/lib/server/db.ts`, `auth.ts`, `session.ts`, `ai.ts`, `aiProviders.ts`, `validation.ts`, `constants.ts`, `format.ts` (pure helpers → `shared/` or `web/src/lib/`).
- Port tests: `worker/db.test.ts`, `worker/*.test.ts` (fake-Db assertions first, per repo rule; fake must expose all/first/run on both prepare() and bind() results — paramless queries call `.all()` directly on the prepared statement).
- Edit: `wrangler.jsonc` (main + assets), `package.json` (scripts below), `tsconfig.json` (include `web/ worker/ shared/`).
- Scripts: `dev` → `vite web` + `wrangler dev` (two terminals, document order); `build` → `vite build web --outdir dist`; `check` → `tsc --noEmit`; `test` → `vitest run`; `deploy` unchanged shape.

Frozen API contract (plans 2–3 code against this, no drift):

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/setup` `{password}` | only when no hash; sets cookie |
| POST | `/api/auth/login` `{password}` | rate-limit 5/15min fail-open; sets cookie |
| POST | `/api/auth/logout` | clears cookie |
| GET | `/api/auth/status` | `{setupRequired, authenticated}` (public) |
| GET/POST | `/api/wallets` | list w/ computed balances; create `{name,kind}` → `'duplicate'` 409 |
| PATCH/DELETE | `/api/wallets/:id` | delete → `'has-transactions'` 409 |
| POST | `/api/wallets/:id/adjust` `{balance}` | posts adjustment tx, no balance column |
| GET/POST | `/api/transactions?month&walletId&search&category&limit&offset` | newest-first, joined wallet names |
| PATCH/DELETE | `/api/transactions/:id` | |
| POST | `/api/transactions/bulk-delete` `{ids}` | → `{deleted}` |
| GET/POST | `/api/debts` | create `{person,direction,amount,date,walletId,reduceBalance}` |
| POST | `/api/debts/:id/payments` `{amount,walletId,date}` | `'overpay'` 409; atomic batch |
| DELETE | `/api/debts/:id`, POST `/api/debts/bulk-delete` | tx rows preserved |
| GET | `/api/dashboard?month` | `{kinds,summary,balances,recent,openDebts,trend}` one round-trip |
| GET | `/api/analytics?month` | `{summary,categoryTotals,walletTotals,trend}` |
| POST | `/api/ai/report` `{messages≤8,providerId?,model?}` | 503 when unconfigured |
| GET | `/api/backup/export`, `/api/backup/export.csv` | full JSON v1 + CSV |
| POST | `/api/backup/import` | validated `BackupData`, merge by id |
| GET/POST/DELETE | `/api/settings/providers`, `/api/settings/active` | `toSummary` strips keys |
| POST | `/api/settings/password` `{old,new}` | |

## Implementation Steps

1. Scaffold `web/|worker/|shared/`, port pure modules (`validation`, `constants`, `format`) unchanged, wire `tsconfig` + scripts. Smoke: `npm run check`.
2. Port `db.ts` → `worker/db.ts` byte-for-byte except imports; port `db.test.ts` fake-Db assertions first, then make suite green.
3. Port `auth/session/ai/aiProviders`; implement Hono app + guard middleware + all routes per contract table; zod on every money path.
4. Minimal shell: `index.html` (theme init script carried over), router with `/login` real + `/*` placeholder, `api/client.ts` with 401 redirect.
5. `wrangler.jsonc` re-point; verify `npm run build` + `wrangler dev` smoke (below).

## Acceptance Criteria

- `npm run check && npm run test` green; suite covers every SQL function as before.
- Unauthenticated `GET /api/wallets` → 401 JSON (never redirect); login flow sets `httpOnly` cookie; 5 bad logins in 15 min → 429.
- Every contract endpoint responds per table (happy path + duplicate/overpay/has-transactions guards).
- `dist/` serves `index.html` on unknown routes (SPA fallback); static assets via ASSETS binding.
- Free-tier fit: Worker bundle < 5 MiB uncompressed (limit 64 MiB); per-request CPU ≈ auth HMAC + ≤3 D1 queries (limit 10 ms CPU, 50 subrequests — single-user traffic ≈ dozens of req/day vs 100k/day quota; D1 ≈ KBs vs 500 MB free DB).

## Verification / Tests

- `npm run check && npm run test && npm run build`.
- Manual smoke on `wrangler dev`: setup → login → cookie present → `GET /api/dashboard?month=YYYY-MM` 200 → logout → 401.
- `wrangler deploy --dry-run` to confirm bundle size + assets directory.

## Git (branch: feature/react-foundation-api)

Branch off `main`; merge back to `main` before plans 2–3 start (they build on the contract + `shared/` types).

## Integration Notes

Merges FIRST. No file overlap with plans 2–3 (only plan touching `worker/`, `shared/`, `wrangler.jsonc`, root configs). If contract table must change mid-build, update this file + notify plans 2–3 owners before merging.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|---|---|---|---|
| 1 scaffold + pure-module ports | builder | — | Inline: trivial, needs current context |
| 2 db.ts port | builder | A | Core logic, builder keeps conventions |
| 2 test-file ports (fake-Db first) | tester | A | Independent files, same source spec, parallel to port |
| 2 endpoint inventory vs old `+page.server.ts` actions | reviewer | A | Read-only recon, catches missing endpoints early |
| 3 Hono app + routes | builder | — | Sequential: needs step 2 types |
| 4 shell + login + client | designer | — | Small UI slice, designer owns React patterns |
| 5 wrangler + smoke | builder | — | Inline: config + verification |
