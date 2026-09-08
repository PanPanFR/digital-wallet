# Digital Wallet

A single-user personal finance tracker built around **wallets**: every income and expense is bound to a named wallet (digital — GoPay, OVO, DANA, … — or physical cash), so balances answer "how much do I have, per wallet, per kind, in total". SvelteKit 2 (Svelte 5) server-rendered app running as one Cloudflare Worker with a D1 (SQLite) database. UI copy is Indonesian; code and docs are English.

## Features

- **Wallets** (`/wallets`): CRUD named wallets of kind `digital` or `cash`, quick presets (GoPay, OVO, DANA, ShopeePay), two seeded defaults. A wallet with transactions cannot be deleted.
- **Balances** — always computed from transactions (`SUM(income) − SUM(expense)`), never stored: per wallet, digital/cash subtotals, and a combined total on the dashboard.
- **Transactions** (`/transactions`): create/edit/delete via form actions with zod validation and inline errors; filter by month and by wallet or kind; 50 per page; quick-add on the dashboard.
- **Dashboard** (`/`): current-month income/expense/net, combined + per-kind totals, per-wallet balances, 5 latest transactions.
- **Analytics** (`/analytics`): per-category bars for a chosen month and a 6-month income/expense trend — pure CSS bars over SQL aggregates, no chart library.
- **AI copilot** (`/copilot`, optional): parse free-text ("beli kopi 25rb") into transactions with preview → confirm → bulk save, and ask questions about the current month. Requires an OpenAI-compatible endpoint (`GOOGLE_API_KEY`); the whole feature returns 503 without it.
- **Auth**: single master password (PBKDF2-SHA256), HMAC-signed session cookie (`dw_session`, 7 days), login rate-limited to 5 attempts / 15 min.
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
GOOGLE_API_KEY=<optional, enables the AI copilot>
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
