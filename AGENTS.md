# AGENTS.md

Single-user finance tracker ("digital-wallet", UI copy Indonesian, code/docs English). Vite + React 19 + Hono on one Cloudflare Worker + D1. Full docs in `docs/` — start at `docs/index.md`.

## Commands

```bash
npm run check    # tsc --noEmit (TS strict)
npm run test     # vitest run (node env, worker/**/*.test.ts, shared/**/*.test.ts)
npm run build    # vite build (outputs to dist/)
npm run dev      # vite (web dev server) + wrangler dev (worker API)
npm run preview  # wrangler dev on built output (dist/)
```

Verification = `npm run check && npm run test && npm run build`.

## Tests: fake-Db, no live D1

All suites are server-side unit tests; `worker/db.test.ts` uses a fake-Db capturing prepared SQL. When changing SQL in `worker/db.ts`, extend the fake-Db assertions **first**. Route/UI behavior is verified manually, not by tests.

## Non-negotiable design rules

- **Balances are computed, never stored.** Always derive from `SUM(CASE type ...)` over transactions (see `BALANCE_SQL` in `worker/db.ts`). Never add a balance column.
- **All SQL lives in `worker/db.ts`**; every function takes `D1Database` as first arg. Keep D1 out of client code.
- **zod validation is server-side, one source of truth** (`shared/validation.ts`). Every money path goes through it — API endpoints and forms alike.
- Auth is one guard: Hono auth middleware in `worker/index.ts`. Unauthenticated `/api/*` gets JSON 401, never a redirect. SPA redirects to `/login` client-side.
- AI provider config precedence: request body-override → active provider (`app_settings.ai_providers`/`ai_active_provider`) → env fallback (`GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL`). API keys never ship to the client (`toSummary` strips them).
- Mutations use TanStack Query mutations (`useMutation`) + query invalidation.

## Schema changes

Edit `schema.sql` (idempotent). **Structural** changes (new column, changed CHECK) need a dedicated `migrations/NNN-*.sql` committed alongside, run `--remote` **before** merging the code that expects the new shape. `wrangler.jsonc` has no `migrations` block — SQL never auto-applies. Details: `docs/deployment.md`.

## Deploy & env

- Push to `main` → Cloudflare Workers Builds auto-deploys. No CI workflows exist. `npm run deploy` is the manual fallback.
- `SESSION_SECRET` is required (no fallback — app throws); `GOOGLE_API_KEY` optional (env fallback for the copilot — prefer a stored provider in `/settings`; `/api/ai/report` returns 503 only when neither a provider nor the env key exists). Local = `.dev.vars`; prod = `wrangler secret put`. Sync is manual.
- Local D1 state lives in `.wrangler/state/` (shared by dev + preview); nuke it to reset, re-run `npx wrangler d1 execute digital-wallet-db --local --file=schema.sql`.
- `--remote` flags target production D1 — be deliberate.

## Workflow conventions

- Work happens per-plan on `feature/<plan-slug>` branches; approved-but-unmerged plans live in `plan/` and are tracked in `docs/index.md`. Do not document plan behavior as current until merged.
- Styling & UI: Tailwind 4, **no config file** (via `@tailwindcss/vite`); class-based dark mode; theme init script in `web/index.html`. Component utilities in `web/src/index.css` (`.card`, `.btn*`, `.input`, `.chip`, `.label`, `.page-header`, `.page-title`, `.page-subtitle`, `.section-header`, `.section-title`, `.list`, `.list-row`, `.tile`). No gradients (solid fills only; light mode uses border + soft shadow, dark mode uses hairline ring). Mobile layout uses safe-area padding (`pb-[env(safe-area-inset-bottom)]`). Modals and bottom sheets use `ModalShell` (`variant="center" | "sheet"`).
- `graphify-out/` exists — for codebase questions run `graphify query` before grep/read; after code changes run `graphify update .`.
