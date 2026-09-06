# Finance Tracker v2

Personal finance tracker: transactions CRUD, monthly dashboard, analytics, and AI copilot (parse free-text transactions, ask questions about your reports). SvelteKit rewrite of the original Next.js app, deployed as a single Cloudflare Worker with D1. OCR dropped.

## Tech Stack

- [SvelteKit](https://kit.svelte.dev) 2 (Svelte 5 runes) + TypeScript
- Tailwind CSS v4
- Cloudflare Workers + D1 (SQLite)
- zod (validation), lucide (icons), vitest (tests)

## Prerequisites

- Node.js 20+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install` pulls it in)
- Cloudflare account with a D1 database
- Optional: Google AI (Gemini) API key for the copilot features

## Setup

1. Install dependencies:

	```bash
	npm install
	```

2. Create a D1 database and put its `database_id` in `wrangler.jsonc`:

	```bash
	npx wrangler d1 create finance-tracker-db
	```

3. Apply the schema (local + remote):

	```bash
	npx wrangler d1 execute finance-tracker-db --local --file schema.sql
	npx wrangler d1 execute finance-tracker-db --remote --file schema.sql
	```

4. Set secrets (once; they persist across deploys):

	```bash
	npx wrangler secret put SESSION_SECRET
	npx wrangler secret put GOOGLE_API_KEY   # optional, enables AI copilot
	```

	For local dev, create `.dev.vars`:

	```
	SESSION_SECRET=any-random-string
	GOOGLE_API_KEY=...   # optional
	```

5. First visit prompts you to set a master password (setup mode), which is the only login method — single-user app.

## Development

```bash
npm run dev      # Vite dev server (HMR, no Workers runtime)
npm run preview  # build + wrangler dev on http://127.0.0.1:8787 (real Workers + local D1)
npm run test     # vitest (auth + AI parser suites)
npm run check    # svelte-check + tsc
npm run build    # production build via adapter-cloudflare
```

> On Windows, if `npm run build` fails with `EPERM ... .svelte-kit\cloudflare`, stop the running `wrangler dev`/`workerd` processes first — they lock the output directory.

## Deploy

On push to `main` via GitHub Actions (`.github/workflows/deploy.yml`), or manually:

```bash
npm run deploy
```

## Environment / Bindings

| Name | Type | Purpose |
|------|------|---------|
| `DB` | D1 binding | Transactions, sessions, rate limits |
| `ASSETS` | Assets binding | Static files (PWA shell) |
| `SESSION_SECRET` | Secret | Session token HMAC |
| `GOOGLE_API_KEY` | Secret | Gemini AI (copilot) — optional |
| `AI_BASE_URL` | Var (optional) | OpenAI-compatible base URL, default `https://9router.panpan.my.id/v1` |
| `AI_MODEL` | Var (optional) | Default `gemini-2.5-flash` |

## Features

- Master password auth: setup, login, logout, change password, 5-attempts/15-min rate limit
- Transactions CRUD: form actions, inline validation, confirm modal, toasts
- Dashboard: current-month summary (income/expense/net) + 5 latest transactions
- Analytics: per-category and 6-month trend bars (pure CSS, SQL aggregates)
- AI copilot: parse free-text into transactions (preview → confirm), ask questions about the current month
- PWA: installable, offline shell, dark/light theme (persisted, defaults to system)
