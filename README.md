# Digital Wallet

A single-user personal finance tracker built around **wallets**: every income and expense is bound to a named wallet (digital — GoPay, OVO, DANA, … — or physical cash), so balances answer "how much do I have, per wallet, per kind, in total". Vite + React 19 Single Page Application served by a Cloudflare Worker with Hono API and a D1 (SQLite) database. UI copy is Indonesian; code and docs are English.

## Features

- **Wallets** (`/wallets`): CRUD named wallets of kind `digital` or `cash`, quick presets (GoPay, OVO, DANA, ShopeePay), two seeded defaults. Duplicate names (case-insensitive) are rejected. A wallet referenced by transactions cannot be deleted. "Atur Saldo" edits a wallet's balance by posting one automatic adjustment transaction (`Penyesuaian saldo`) — balances stay computed.
- **Balances** — always computed from transactions (`SUM(income) − SUM(expense)`, transfers signed per side), never stored: per wallet, digital/cash subtotals, and a combined total on the dashboard.
- **Transactions** (`/transactions`): create/edit/delete with zod validation and inline errors; income/expense/**transfer** (wallet→wallet, excluded from income/expense aggregates) with an explicit `date`; filter by month, wallet/kind, description search, and category; 50 per page with offset paging; bulk select + delete; quick-add on the dashboard.
- **Debts / Hutang** (`/debts`): two-way records (`owe`/`owed`) with partial payments; each payment atomically writes a matching transaction and touches the chosen wallet. Deleting a debt cascades to remove its payment records while preserving paired wallet transactions (the money already moved). Open totals show on the dashboard.
- **Dashboard** (`/`): month picker with net balance for the month, combined + per-kind totals, 6-month monthly trend bar chart, hutang/piutang summary, per-wallet balances, 5 latest transactions.
- **Analytics** (`/analytics`): interactive charts (powered by Recharts) showing category expense distribution, per-wallet expense totals, and a 6-month income/expense comparison over SQL aggregates.
- **AI copilot** (`/copilot`): chatbox answering questions about your finances (month summaries, categories, trends, wallet balances, open debts injected as a JSON snapshot; read-only, never writes). Providers (base URL, API key, models) are managed in `/settings`; with no stored provider the app falls back to `GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL` env, and with neither configured the endpoint returns 503.
- **Auth**: single master password (PBKDF2-SHA256), HMAC-signed session cookie (`dw_session`, 7 days), login rate-limited to 5 attempts / 15 min. `/settings` holds change-password, the AI provider CRUD, and data portability (versioned JSON backup/restore via merge import, plus CSV transaction export).
- **UI**: dark/light theme (system default, persisted in `localStorage`), desktop sidebar + 5-slot mobile bottom navigation with sheet drawer (`ModalShell variant="sheet"`), toasts, confirm modals, focus-trapped dialogs, solid surface tokens (no gradients), and reduced-motion support.

> No offline support: the app needs network. The old service worker was removed (a cache-first SW served stale page data after deletes); `static/sw.js` now only unregisters stale workers left over from old deploys. Details: [docs/architecture.md](docs/architecture.md).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, React Router 7, TanStack Query 5, TypeScript strict |
| Styling | Tailwind CSS 4 (class-based dark mode) |
| Charts | Recharts 3 (SVG) |
| Backend & Runtime | Cloudflare Worker (Hono 4, `nodejs_compat`) |
| Database | Cloudflare D1 (`digital-wallet-db`), schema in [`schema.sql`](schema.sql) |
| Validation | zod 3 |
| Icons | `lucide-react` |
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
| `npm run dev` | Vite dev server (web SPA with HMR on port 5173, proxies `/api` to 8787) |
| `npm run dev:worker` | `wrangler dev` — runs Worker API + local D1 on http://127.0.0.1:8787 |
| `npm run build` | Production Vite build to `dist/` |
| `npm run preview` | `wrangler dev` on http://127.0.0.1:8787 — real Worker runtime + local D1, serving `dist/` |
| `npm run test` | `vitest run` — unit tests under `worker/**/*.test.ts` and `shared/**/*.test.ts` |
| `npm run check` | `tsc --noEmit` (TypeScript strict check) |
| `npm run deploy` | `npm run build && wrangler deploy` — manual deploy (fallback; Workers Builds is primary) |

## Documentation

Start at [docs/index.md](docs/index.md).

- [docs/architecture.md](docs/architecture.md) — how it works
- [docs/data-model.md](docs/data-model.md) — every table, column, constraint
- [docs/development.md](docs/development.md) — local setup, env vars, tests, troubleshooting
- [docs/deployment.md](docs/deployment.md) — Workers Builds, D1 remote schema, secrets, rollback
