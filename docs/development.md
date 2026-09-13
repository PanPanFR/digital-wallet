# Development

What you'll get from this doc: a working local environment from a fresh clone (wrangler auth, local D1, `.dev.vars`), the day-to-day commands (dev/test/check), and fixes for the failures people actually hit with wrangler/Vite on this stack. Data semantics: [data-model.md](data-model.md). Shipping: [deployment.md](deployment.md).

## Prerequisites

- **Node.js 20+** — 22 LTS recommended (the CI bump to Node 22 was needed for wrangler 4; don't run older majors).
- **npm** (lockfile is `package-lock.json`).
- **A Cloudflare account** — for `wrangler login` and the `wrangler d1` setup commands. After local D1 state exists, `npm run dev` itself needs no network (the AI copilot obviously does).

## First-time setup

```bash
npm install
npx wrangler login          # opens the Cloudflare OAuth browser flow
```

Create the D1 database only if the `database_id` in `wrangler.jsonc` isn't yours (fresh clone of the real repo already points at `digital-wallet-db` / `a6c5170a-84d4-4077-9670-5dadeac0eba5`; a brand-new setup needs its own):

```bash
npx wrangler d1 create digital-wallet-db
# → copy the printed database_id into wrangler.jsonc → d1_databases[0].database_id
```

Initialize the **local** database (the dev server and `wrangler dev` share one local state under `.wrangler/state`; it starts empty):

```bash
npx wrangler d1 execute digital-wallet-db --local --file=schema.sql
```

Create `.dev.vars` in the repo root (git-ignored, `.gitignore:4`). Use names exactly as below — see the env table for what each does:

```
SESSION_SECRET=any-random-string
GOOGLE_API_KEY=optional-key-enables-copilot
```

## Environment variables & bindings

Read via `platform.env` (SvelteKit) or `process.env` (server code with `nodejs_compat`). **Never put real secret values in the repo** — `.dev.vars` is for local dev only; production gets Worker secrets.

| Name | Kind | Secret? | Purpose | Where read |
|---|---|---|---|---|
| `DB` | D1 binding | no | App database (`digital-wallet-db`) | every route via `platform.env.DB` → `lib/server/db.ts` |
| `ASSETS` | Assets binding | no | Static files + app shell | adapter-generated (worker entry) |
| `SESSION_SECRET` | secret | **yes** | HMAC-SHA256 key for session tokens. **No fallback** — `getSessionSecret()` throws if unset, so the app cannot boot without it | `src/lib/server/auth.ts:21-30` |
| `GOOGLE_API_KEY` | secret | **yes** | Bearer token for the env-fallback AI config (name kept for old-app compatibility). Only consulted when no provider is stored in `/settings`. Optional: with neither, `/api/ai/report` returns 503 and the copilot shows "AI belum dikonfigurasi" | `src/routes/api/ai/report/+server.ts:40` |
| `AI_BASE_URL` | plain var | no | Chat-completions base URL for the env fallback. Default `https://9router.panpan.my.id/v1` (`ai.ts:13`) | `src/lib/server/ai.ts:25` |
| `AI_MODEL` | plain var | no | Model name for the env fallback. Default `gemini-2.5-flash` (`ai.ts:14`) | `src/lib/server/ai.ts:27` |

Note on local vs prod secrets: local dev reads `.dev.vars`; `wrangler secret put` only affects the deployed Worker. Keeping both in sync is manual.

## Daily workflow

```bash
npm run dev       # http://localhost:5173 — Vite HMR; adapter-cloudflare emulates the Worker
                  # platform (local D1 + .dev.vars) via Miniflare
npm run preview   # http://127.0.0.1:8787 — `wrangler dev` on the built output: real Workers
                  # runtime, same local D1. Use this before shipping anything runtime-sensitive.
npm run test      # vitest run
npm run check     # svelte-kit sync + svelte-check (typescript strict; see tsconfig.json)
npm run build     # production output in .svelte-kit/cloudflare
```

First visit to a fresh local DB shows `/login` in **setup mode** — pick any master password (≥8 chars). Setup state is just `app_settings.master_password_hash` being empty; nuke `.wrangler/state/` to reset everything.

### Where local D1 state lives

`.wrangler/state/` (git-ignored): the same SQLite backing is shared by `vite dev` and `wrangler dev`. Inspect it directly:

```bash
npx wrangler d1 execute digital-wallet-db --local --command "SELECT * FROM wallets"
```

`--remote` instead of `--local` targets the production database — be deliberate about it.

## Tests

`npm run test` → vitest, node environment, `src/**/*.test.ts` (config: `vitest.config.ts`). Current suites, all server-side logic, no live D1 — `db.test.ts` uses a fake-Db pattern capturing prepared SQL:

| File | Covers |
|---|---|
| `src/lib/server/auth.test.ts` | password hash/verify round-trip, token create/verify, expiry |
| `src/lib/server/db.test.ts` | wallet CRUD (duplicate-name guard, balance adjustment), transaction filters/bulk delete, debt CRUD + payment batching/overpay guard + cascade delete with payments (keeping wallet transactions), computed balances (empty wallet = 0, per-kind subtotals) |
| `src/lib/server/validation.test.ts` | `TxSchema`/`WalletSchema`/debt schemas — money-path rules |
| `src/lib/server/ai.test.ts` | `chatAnswer`: request shape, history/context injection, OpenAI/Gemini response unwrapping, friendly 429/5xx errors |
| `src/lib/server/aiProviders.test.ts` | provider JSON round-trip, defensive corrupt-JSON parse, config precedence, `toSummary` key stripping |

Route/UI behavior is verified manually (`docs/specs/2026-09-03-svelte-rewrite-design.md` § Testing). When changing SQL in `db.ts`, extend the fake-Db assertions first — that's where drift gets caught.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `npm run build` fails `EPERM ... .svelte-kit\cloudflare` (Windows) | A running `wrangler dev`/`workerd` locks the output dir. Kill those processes, then build. |
| Dev server throws "SESSION_SECRET is not configured" | Missing `.dev.vars` or missing key in it. Copy the snippet above. Note the Vite dev server may need a restart after creating the file. |
| Pages render but every query fails / empty app | Local D1 not initialized: run the `--local --file=schema.sql` command from setup. Seeded wallets ("Tunai", "Dompet Digital") are your tell that it ran. |
| Copilot says "Fitur AI belum dikonfigurasi" (503) | No provider stored in `/settings` **and** no `GOOGLE_API_KEY` in `.dev.vars` (local) or Worker secrets (prod). Expected degradation, not a crash. |
| AI calls fail with 429/5xx messages surfaced in UI | Upstream endpoint (`AI_BASE_URL`) rate-limiting — retry later or point `AI_BASE_URL` elsewhere. |
| Deleted transactions "come back" after navigating | You're hitting a browser still holding the **old** service worker (pre-fix deploys). Current code never registers an SW; the cleanup stub in `static/sw.js` unregisters and purges caches on visit. Hard-reload once if testing a stale deploy. |
| Login says "Terlalu banyak percobaan" though you didn't try | `rate_limits` window is global (single-user app, no IP split). Clear with `--local --command "DELETE FROM rate_limits WHERE key='login'"`. |
| `wrangler login` hangs / 403 | Corporate browser session; retry with `npx wrangler logout && npx wrangler login`. |
