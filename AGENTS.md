# AGENTS.md

Single-user finance tracker ("digital-wallet", UI copy Indonesian, code/docs English). SvelteKit 2 + Svelte 5 runes, one Cloudflare Worker + D1. Full docs in `docs/` — start at `docs/index.md`.

## Commands

```bash
npm run check    # svelte-kit sync + svelte-check (TS strict) — run after pulling, .svelte-kit/ is generated
npm run test     # vitest run (node env, src/**/*.test.ts)
npm run build    # output .svelte-kit/cloudflare
npm run dev      # Vite dev server, emulates Worker (local D1 + .dev.vars) via Miniflare
npm run preview  # wrangler dev on built output — use before shipping runtime-sensitive changes
```

No lint script. Verification = `npm run check && npm run test`.

Windows gotcha: `npm run build` fails `EPERM ... .svelte-kit\cloudflare` if a `wrangler dev`/workerd process is running — kill it first.

## Tests: fake-Db, no live D1

All suites are server-side unit tests; `db.test.ts` uses a fake-Db capturing prepared SQL. When changing SQL in `src/lib/server/db.ts`, extend the fake-Db assertions **first**. Route/UI behavior is verified manually, not by tests.

## Non-negotiable design rules

- **Balances are computed, never stored.** Always derive from `SUM(CASE type ...)` over transactions (see `BALANCE_SQL` in `db.ts`). Never add a balance column.
- **All SQL lives in `src/lib/server/db.ts`**; every function takes `D1Database` as first arg. Keep D1 out of client code.
- **zod validation is server-side, one source of truth** (`src/lib/server/validation.ts`). Every money path goes through it — form actions and API endpoints alike.
- Auth is one guard: `src/hooks.server.ts`. Unauthenticated `/api/*` gets JSON 401, never a redirect.
- AI provider config precedence: request body-override → active provider (`app_settings.ai_providers`/`ai_active_provider`) → env fallback (`GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL`). API keys never ship to the client (`toSummary` strips them).
- Mutations use SvelteKit form actions + `invalidateAll()`, never hand-rolled `fetch` (except the copilot chat endpoint `/api/ai/report`).

## Schema changes

Edit `schema.sql` (idempotent). **Structural** changes (new column, changed CHECK) need a dedicated `migrations/NNN-*.sql` committed alongside, run `--remote` **before** merging the code that expects the new shape. `wrangler.jsonc` has no `migrations` block — SQL never auto-applies. Details: `docs/deployment.md`.

## Deploy & env

- Push to `main` → Cloudflare Workers Builds auto-deploys. No CI workflows exist. `npm run deploy` is the manual fallback.
- `SESSION_SECRET` is required (no fallback — app throws); `GOOGLE_API_KEY` optional (env fallback for the copilot — prefer a stored provider in `/settings`; `/api/ai/report` returns 503 only when neither a provider nor the env key exists). Local = `.dev.vars`; prod = `wrangler secret put`. Sync is manual.
- Local D1 state lives in `.wrangler/state/` (shared by dev + preview); nuke it to reset, re-run `npx wrangler d1 execute digital-wallet-db --local --file=schema.sql`.
- `--remote` flags target production D1 — be deliberate.

## Workflow conventions

- Work happens per-plan on `feature/<plan-slug>` branches; approved-but-unmerged plans live in `plan/` and are tracked in `docs/index.md`. Do not document plan behavior as current until merged.
- Styling: Tailwind 4, **no config file** (via `@tailwindcss/vite`); class-based dark mode; theme init script in `app.html`.
- `graphify-out/` exists — for codebase questions run `graphify query` before grep/read; after code changes run `graphify update .`.
