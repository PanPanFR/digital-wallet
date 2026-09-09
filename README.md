# Digital Wallet

A single-user personal finance tracker built around **wallets**: every income and expense is bound to a named wallet (digital — GoPay, OVO, DANA, … — or physical cash), so balances answer "how much do I have, per wallet, per kind, in total". SvelteKit 2 (Svelte 5) server-rendered app running as one Cloudflare Worker with a D1 (SQLite) database. UI copy is Indonesian; code and docs are English.

## Features

- **Wallets** (`/wallets`): CRUD named wallets of kind `digital` or `cash`, quick presets (GoPay, OVO, DANA, ShopeePay), two seeded defaults. Duplicate names (case-insensitive) are rejected. A wallet referenced by transactions cannot be deleted. "Atur Saldo" edits a wallet's balance by posting one automatic adjustment transaction (`Penyesuaian saldo`) — balances stay computed.
- **Balances** — always computed from transactions (`SUM(income) − SUM(expense)`, transfers signed per side), never stored: per wallet, digital/cash subtotals, and a combined total on the dashboard.
- **Transactions** (`/transactions`): create/edit/delete via form actions with zod validation and inline errors; income/expense/**transfer** (wallet→wallet, excluded from income/expense aggregates) with an explicit `date`; filter by month, wallet/kind, description search, and category; 50 per page with offset paging; bulk select + delete; quick-add on the dashboard.
- **Debts / Hutang** (`/hutang`): two-way records (`owe`/`owed`) with partial payments; each payment atomically writes a matching transaction and touches the chosen wallet. Debts with payments cannot be deleted (bulk delete skips and reports them). Open totals show on the dashboard.
- **Dashboard** (`/`): month picker with net balance for the month, combined + per-kind totals, hutang/piutang summary, per-wallet balances, 5 latest transactions.
- **Analytics** (`/analytics`): per-category bars for a chosen month, per-wallet expense totals, and a 6-month income/expense trend — pure CSS bars over SQL aggregates, no chart library.
- **AI copilot** (`/copilot`): chatbox answering questions about your finances (month summaries, categories, trends, wallet balances, open debts injected as a JSON snapshot; read-only, never writes). Providers (base URL, API key, models) are managed in `/settings`; with no stored provider the app falls back to `GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL` env, and with neither configured the endpoint returns 503.
- **Auth**: single master password (PBKDF2-SHA256), HMAC-signed session cookie (`dw_session`, 7 days), login rate-limited to 5 attempts / 15 min. `/settings` holds change-password and the AI provider CRUD.
- **UI**: dark/light theme (system default, persisted in `localStorage`), desktop sidebar + mobile bottom nav, toasts, confirm modals, focus-trapped dialogs.

> No offline support: the app needs network. The old service worker was removed (a cache-first SW served stale page data after deletes); `static/sw.js` now only unregisters stale workers left over from old deploys. Details: [docs/architecture.md](docs/architecture.md).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit 2, Svelte 5 (runes), TypeScript strict |
| Styling | Tailwind CSS 4 (class-based dark mode) |
| Runtime | Cloudflare Worker (`@sveltejs/adapter-cloudflare` 7, `nodejs_compat`) |
| Database | Cloudflare D1 (`digital-wallet-db`), schema in [`schema.sql`](schema.sql) |
| Validation | zod 3 |
| Icons | `@lucide/svelte` |
| Tests | vitest 3 (node environment) |
| Deploy | Cloudflare Workers Builds (push to `main`) — see [docs/deployment.md](docs/deployment.md) |

## Quick start

Prerequisites: Node.js 20+ (22 LTS recommended), a Cloudflare account. Full walkthrough with troubleshooting: [docs/development.md](docs/development.md).

```bash
npm install
npx wrangler login                                                # once per machine
npx wrangler d1 execute digital-wallet-db --local --file=schema.sql   # local D1; skip if reusing the DB id already in wrangler.jsonc
```

Create `.dev.vars` (git-ignored; values are yours — names/purposes in [docs/development.md](docs/development.md)):

```
SESSION_SECRET=<any-random-string>
GOOGLE_API_KEY=<optional env fallback for the AI copilot; providers can also be stored in /settings>
```

```bash
npm run dev
```

Open http://localhost:5173 — the first visit asks you to set a master password (setup mode); that password is the only login, the app is single-user.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server; adapter-cloudflare emulates the Worker platform (local D1, `.dev.vars`) via Miniflare |
| `npm run build` | Production build to `.svelte-kit/cloudflare` |
| `npm run preview` | `wrangler dev` on http://127.0.0.1:8787 — real Worker runtime + local D1, serving the build output |
| `npm run test` | `vitest run` — unit tests under `src/**/*.test.ts` (auth, db, AI, validation) |
| `npm run check` | `svelte-kit sync` + `svelte-check` (types, including `.svelte` files) |
| `npm run deploy` | `npm run build && wrangler deploy` — manual deploy (fallback; Workers Builds is primary) |

## Documentation

Start at [docs/index.md](docs/index.md).

- [docs/architecture.md](docs/architecture.md) — how it works
- [docs/data-model.md](docs/data-model.md) — every table, column, constraint
- [docs/development.md](docs/development.md) — local setup, env vars, tests, troubleshooting
- [docs/deployment.md](docs/deployment.md) — Workers Builds, D1 remote schema, secrets, rollback
