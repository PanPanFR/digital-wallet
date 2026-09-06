# Implementation Plan: Finance Tracker v2 — SvelteKit Rewrite

> **For agentic workers:** Execute task-by-task in order. Steps use checkbox (`- [ ]`) syntax for tracking. Read `plan/PRE-PLAN.md` and `docs/specs/2026-09-03-svelte-rewrite-design.md` first.

**Goal:** Rewrite the Next.js finance tracker as an idiomatic SvelteKit app on Cloudflare Workers + D1, feature parity minus OCR.

**Architecture:** SvelteKit SSR deployed as one Worker (static assets + API). CRUD via form actions, data via load functions, auth via server hooks. D1 database and schema unchanged from old repo — no data migration.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Tailwind v4, Cloudflare Workers + D1, zod, lucide-svelte, vitest, npm.

**Spec:** `docs/specs/2026-09-03-svelte-rewrite-design.md`

## Reference

- `plan/PRE-PLAN.md` — shared context, conventions, old-repo porting URLs
- `docs/specs/2026-09-03-svelte-rewrite-design.md` — approved design

## Objective

Full rewrite in `finance-tracker-v2/` (currently empty). Same D1 database as the old app: existing transactions and master password keep working.

## Scope

In: auth (setup/login/logout/change-password/rate-limit), transactions CRUD, dashboard, analytics, AI parse + AI report + copilot page, PWA shell, Tailwind UI (Indonesian), deploy workflow, unit tests for auth + AI parser.
Out: OCR (dropped), multi-user, chart libraries, Workbox.

## Dependencies

Single workstream. Task order is sequential by construction (each task consumes earlier interfaces); only Task 8 (docs) runs in parallel. Task 1 must exist before all others.

## Files / Areas Likely Affected

Everything in `finance-tracker-v2/` — see PRE-PLAN structure. No files outside this directory.

## Global Constraints

- Secrets (`SESSION_SECRET`, `GOOGLE_API_KEY`) server-only; never referenced in `.svelte` client code.
- Auth guard: all routes except `/login` + static assets require a valid session; unauthenticated `/api/*` gets 401 JSON, never a redirect.
- `auth.ts` ported verbatim from old repo — session token and password hash formats must stay compatible.
- `schema.sql` unchanged. D1 binding name: `DB`.
- UI copy Indonesian. File contents English.
- No new runtime deps beyond: `@sveltejs/kit`, `@sveltejs/adapter-cloudflare`, `@sveltejs/vite-plugin-svelte`, `svelte`, `vite`, `tailwindcss`, `@tailwindcss/vite`, `zod`, `lucide-svelte`, `vitest`, `svelte-check`, `typescript`, `wrangler`.
- Every task ends with: `npm run check` passing + commit.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1. Scaffold + config | builder | – | Foundation; precise config, needs care with wrangler/adapter versions |
| 2. Port server libs + auth tests | builder | – | Port of proven code; security-sensitive (auth) |
| 2b. Auth unit test suite | tester | A | Tests derivable from old `auth.ts` behavior (raw URL), independent of builder's port mechanics |
| 3. Hooks + login + settings | builder | – | Depends on Task 2 `auth.ts`/`db.ts` exports |
| 4. Transactions CRUD | builder | – | Depends on Task 3 guard; defines `lib/components` patterns |
| 5. Dashboard + analytics | designer | – | UI-heavy loads pages; depends on Task 4 components/db exports |
| 6. AI endpoints + copilot | builder | – | Server logic (Gemini, secrets); depends on Task 2 `ai.ts` |
| 7. PWA + theme + nav polish | designer | – | Isolated UI work on `static/` + layout |
| 8. README + deploy docs | documenter | B | Parallel to 7; docs only, no shared files |
| 9. Review + deploy workflow | reviewer then builder | – | Reviewer after all mutating work; builder applies fixes + final verify |

Sequential dependencies: 3←2, 4←3, 5←4, 6←2, 7←5, 9←7+8.
Parallel batches:
- Batch A (2b with 2): tester writes `src/lib/server/auth.test.ts` from old-repo behavior while builder ports; builder runs the suite after porting.
- Batch B (7, 8): no shared files (`static/` + layout vs `README.md`).

---

### Task 1: Scaffold, Config, Smoke Test

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`, `src/app.d.ts`, `wrangler.jsonc`, `schema.sql` (copy old repo), `.gitignore`, `.npmrc`
- Create: `src/routes/+layout.svelte` (stub), `src/routes/+page.svelte` (stub "ok")

**Interfaces:**
- Produces: working `npm run dev` / `wrangler dev`, `src/lib/server/db.ts` pattern (`locals.platform.env.DB` typing in `app.d.ts`), Tailwind pipeline used by all later tasks.

- [ ] **Step 1: git init + branch**

```bash
git init
git checkout -b feature/svelte-rewrite
```

- [ ] **Step 2: scaffold SvelteKit manually (no create wizard bloat)**

```bash
npm init -y
npm i -D @sveltejs/kit @sveltejs/adapter-cloudflare @sveltejs/vite-plugin-svelte svelte vite tailwindcss @tailwindcss/vite svelte-check typescript vitest wrangler
npm i zod lucide-svelte
```

`svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: { adapter: adapter() }
};
export default config;
```

`vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
```

`src/app.css`: `@import 'tailwindcss';` plus dark-mode variant `@custom-variant dark (&:where(.dark, .dark *));` (class-based dark mode, matches old ThemeToggle).

`package.json` scripts:

```json
{
	"scripts": {
		"dev": "vite dev",
		"build": "vite build",
		"preview": "wrangler dev",
		"check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
		"test": "vitest run",
		"deploy": "npm run build && wrangler deploy"
	}
}
```

- [ ] **Step 3: wrangler.jsonc with D1 + assets**

```jsonc
{
	"name": "finance-tracker-v2",
	"main": ".svelte-kit/cloudflare/_worker.js",
	"compatibility_date": "2026-01-15",
	"compatibility_flags": ["nodejs_compat"],
	"assets": {
		"directory": ".svelte-kit/cloudflare",
		"binding": "ASSETS"
	},
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "finance-tracker-db",
			"database_id": "USE_OLD_REPO_DATABASE_ID"
		}
	],
	"vars": {},
	"observability": { "enabled": true }
}
```

Note: take `database_id` from the old repo's `wrangler.toml` (raw URL in PRE-PLAN) — same database. Secrets go via `npx wrangler secret put SESSION_SECRET` / `GOOGLE_API_KEY`, never in this file.

- [ ] **Step 4: schema + local D1**

Copy `schema.sql` from old repo verbatim. Apply locally:

```bash
npx wrangler d1 execute finance-tracker-db --local --file=schema.sql
```

- [ ] **Step 5: smoke test**

Stub `src/routes/+page.svelte` renders "Finance Tracker v2". Run `npm run build` then `npm run preview` — page loads at localhost:8787. Then `npm run check` passes.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: scaffold SvelteKit + adapter-cloudflare + Tailwind v4 + D1 binding"
```

---

### Task 2: Port Server Libs (`db.ts`, `auth.ts`, `ai.ts`) + Auth Tests

**Files:**
- Create: `src/lib/server/db.ts`, `src/lib/server/auth.ts`, `src/lib/server/ai.ts`
- Test: `src/lib/server/auth.test.ts` (Batch A — written by tester)
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: `App.Locals.platform.env.DB` (Task 1), old-repo source files (raw URLs in PRE-PLAN).
- Produces:
  - `type TxRow = { id: string, description: string, amount: number, category: string, type: 'income' | 'expense', created_at: string, updated_at: string }` (exported, used by all UI tasks)
  - `db.ts`: `listTransactions(db, { limit?, offset? })`, `getTransaction(db, id)`, `createTransaction(db, tx)`, `updateTransaction(db, id, tx)`, `deleteTransaction(db, id)`, `getMonthlySummary(db, month)`, `getCategoryTotals(db, month)`, `getMonthlyTotals(db, months)`, `getSetting(db, key)`, `setSetting(db, key, value)`, `hitRateLimit(db, key, windowMs, max)`. All take `D1Database` as first param, return `TxRow` where applicable.
  - `auth.ts`: `hashPassword(password, salt?)`, `verifyPassword(password, stored)`, `createSessionToken(password)`, `verifySessionToken(token)`, `sessionCookieName` — signatures and behavior identical to old `src/lib/auth.ts`.
  - `ai.ts`: `parseTransactions(apiKey, text)`, `reportAnswer(apiKey, question, summaryJson)` — merged from old `ai.ts`/`aiParser.ts`/`aiReport.ts`, zod-validated outputs.

- [ ] **Step 1: vitest.config.ts**

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
```

- [ ] **Step 2: port `auth.ts` verbatim from old repo**

Fetch `https://raw.githubusercontent.com/PanPanFR/finance-tracker/master/src/lib/auth.ts`, adapt only imports/typing to `App.Platform` (Web Crypto — no Node APIs). Do NOT change hashing, token format, or timing-safe comparison. This is what keeps the existing master password + sessions working.

- [ ] **Step 3: port `db.ts`** — fetch old `src/lib/db.ts`, split into the query functions listed under Produces. SQL from old file kept as-is (same schema). Aggregations for Task 5 use `GROUP BY`.

- [ ] **Step 4: port + merge `ai.ts`** — fetch old `ai.ts`, `aiParser.ts`, `aiReport.ts`; merge into one module. Add zod schema for parse output (array of `{ description: string, amount: number, category: string, type: 'income'|'expense' }`), drop malformed entries instead of throwing.

- [ ] **Step 5: run auth test suite (from Batch A)** — `npm run test`. Expected: all pass. Failures mean the port drifted — fix the port, never the test.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: port server libs (db, auth, ai) from old repo"
```

---

### Task 2b (Batch A): Auth Unit Test Suite

**Files:**
- Test: `src/lib/server/auth.test.ts`, `src/lib/server/ai.test.ts`

**Interfaces:**
- Consumes: `auth.ts` + `ai.ts` signatures listed in Task 2 Produces (write tests against these before implementation lands).
- Produces: failing-first suites the builder runs in Task 2 Step 5.

- [ ] **Step 1: write auth tests from old-repo behavior**

Read old `src/lib/auth.ts` (raw URL in PRE-PLAN). Cover:
- `hashPassword` → `verifyPassword` roundtrip (correct password true, wrong false)
- hash format matches old app: stored value must contain salt + SHA-256 digest structure exactly as old `verifyPassword` expects (cross-check with old code)
- `createSessionToken` → `verifySessionToken` roundtrip; tampered token (flip 1 char) → false; expired token (old `expiresAt`) → false
- token is deterministic given same password+time base or carries its own timestamp — assert per old implementation

Use Web Crypto (`crypto.subtle`) — vitest Node 20 has it globally.

- [ ] **Step 2: write AI parser tests**

Cover `parseTransactions` normalization (mock `fetch` — no real API):
- valid Gemini JSON response → array of `{ description, amount, category, type }`
- malformed entries (missing amount, bad type, non-object) dropped, valid ones kept
- response with zero valid transactions → empty array (no throw)
- Gemini HTTP 429/500 → rejects with mapped error message

- [ ] **Step 3: verify tests fail** (modules not implemented yet) — `npm run test` expected FAIL.
- [ ] **Step 4: report** — one compact message: test count, cases covered, run command.

---

### Task 3: Auth Guard + Login/Logout/Settings

**Files:**
- Create: `src/hooks.server.ts`, `src/routes/login/+page.server.ts`, `src/routes/login/+page.svelte`, `src/routes/settings/+page.server.ts`, `src/routes/settings/+page.svelte`
- Modify: `src/routes/+layout.svelte` (sign-out button when authed)

**Interfaces:**
- Consumes: `auth.ts` + `db.ts` exports (Task 2).
- Produces: `locals.session = true` for guarded routes; cookie `session` (name from `sessionCookieName`); route `/?/setup` and `/?/login` actions on `/login`, `/?/change-password` on `/settings`.

- [ ] **Step 1: hooks.server.ts**

```ts
import { redirect } from '@sveltejs/kit';
import { verifySessionToken, sessionCookieName } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

const PUBLIC_PATHS = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(sessionCookieName);
	const valid = token ? await verifySessionToken(token) : false;

	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

	if (!valid) {
		if (path.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		if (!isPublic) redirect(303, '/login');
	}

	if (valid && path === '/login') redirect(303, '/');

	return resolve(event);
};
```

- [ ] **Step 2: login page** — single page, two modes. On load: `getSetting(db, 'master_password_hash')` decides mode (absent → setup form, present → login form). Actions:
  - `?/setup`: reject if hash already exists (403); zod: min 8 chars; `hashPassword`; `setSetting(db, 'master_password_hash', ...)`; set session cookie (`createSessionToken(password)`, httpOnly, secure in prod, sameSite lax, 7-day maxAge per old app); redirect 303 `/`.
  - `?/login`: `hitRateLimit(db, 'login', 15*60_000, 5)` — 429 with friendly message when exceeded; verify via `verifyPassword` against stored hash; on success set cookie + redirect `/`; on failure `fail(400, { error: 'Password salah' })`.
- [ ] **Step 3: login page UI** — centered card, Indonesian copy, show `form?.error` inline; `Skeleton` not needed here.
- [ ] **Step 4: settings page** — `?/change-password`: requires current password (verify before allowing), zod min 8, update hash, keep session valid (same token scheme; old app re-issues cookie — do the same). Inline success/error state.
- [ ] **Step 5: verify manually** — `npm run dev`: fresh DB → setup flow → dashboard; logout → login flow; wrong password 5× → rate-limited message; unauthenticated `/transactions` redirects; unauthenticated `/api/ai/parse` returns 401 JSON.
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: session guard hooks, login/setup/settings with form actions"
```

---

### Task 4: Transactions CRUD

**Files:**
- Create: `src/routes/transactions/+page.server.ts`, `src/routes/transactions/+page.svelte`
- Create: `src/lib/stores.svelte.ts` (toast runes), `src/lib/components/{Toast,ConfirmModal,TransactionForm,ModalAction}.svelte`, `src/lib/server/modalAccessibility.ts` (Svelte action)

**Interfaces:**
- Consumes: `db.ts` transaction functions (Task 2), guard session (Task 3).
- Produces: actions `?/create`, `?/update` (with `id`), `?/delete` (with `id`); component `TransactionForm` props `{ transaction?: TxRow, onsubmit: SubmitFunction }`; toast API `toasts.push({ type: 'success'|'error', message })`.

- [ ] **Step 1: list load + form actions** — `load`: `listTransactions(db, { limit: 50 })` + month filter via URL param `?month=YYYY-MM` (SQL `WHERE created_at LIKE 'YYYY-MM%'` — matches old behavior). Actions: zod parse `{ description: string min 1, amount: number positive, category: string, type: 'income'|'expense' }`; on success call db function; `fail(400, { errors: fieldErrors })` on validation failure. SvelteKit CSRF protects form actions natively.
- [ ] **Step 2: TransactionForm component** — port old `TransactionForm.tsx` (raw URL): fields deskripsi, jumlah, kategori (select with Indonesian categories from old app: e.g. 'Makanan', 'Transportasi', 'Tagihan', 'Hiburan', 'Belanja', 'Kesehatan', 'Lainnya'), type toggle income/expense. Inline field errors from `form?.errors`.
- [ ] **Step 3: delete flow** — `<form action="?/delete" method="POST">` with hidden `id`, wrapped in `ConfirmModal` port (old `ConfirmModal.tsx`): `ModalAction` = port of `useModalAccessibility` as Svelte action (focus trap + ESC + restore focus), applied to the dialog element.
- [ ] **Step 4: toast store** — `src/lib/stores.svelte.ts`:

```ts
export const toasts = $state<{ id: number; type: 'success' | 'error'; message: string }[]>([]);
export function notify(type: 'success' | 'error', message: string) {
	const id = Date.now() + Math.random();
	toasts.push({ id, type, message });
	setTimeout(() => {
		const i = toasts.findIndex((t) => t.id === id);
		if (i !== -1) toasts.splice(i, 1);
	}, 3500);
}
```

`Toast.svelte` renders `toasts` bottom-right; call `notify()` after successful mutations via `enhance` callback.

- [ ] **Step 5: use `enhance` from `$app/forms`** on create/update/delete forms for toasts + `invalidateAll()` (default) so list + dashboard refresh.
- [ ] **Step 6: verify** — add/edit/delete transaction end-to-end in `npm run dev`; invalid submit shows inline errors; toast appears; modal traps focus + closes on ESC.
- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: transactions CRUD with form actions, modal, toast"
```

---

### Task 5: Dashboard + Analytics

**Files:**
- Create: `src/routes/+page.server.ts` (replace stub), `src/routes/analytics/+page.server.ts`, `src/routes/analytics/+page.svelte`
- Modify: `src/routes/+page.svelte` (real dashboard)
- Create: `src/lib/components/Navigation.svelte`, `src/lib/components/Skeleton.svelte`

**Interfaces:**
- Consumes: `getMonthlySummary`, `getCategoryTotals`, `getMonthlyTotals`, `listTransactions` (Task 2); toast store (Task 4).
- Produces: `Navigation` used by `+layout.svelte` (bottom nav mobile / sidebar desktop, routes: Beranda `/`, Transaksi `/transactions`, Analitik `/analytics`, Copilot `/copilot`, Pengaturan `/settings`).

- [ ] **Step 1: dashboard load** — current month summary (`getMonthlySummary`: total income, total expense, net) + 5 latest transactions. Sums computed in SQL, not JS.
- [ ] **Step 2: dashboard UI** — port old `page.tsx` layout (raw URL): summary cards, quick-add via `TransactionForm` (reuse Task 4), latest list. Indonesian copy.
- [ ] **Step 3: analytics load** — `getCategoryTotals` (per category this month) + `getMonthlyTotals` (last 6 months). SQL `GROUP BY`.
- [ ] **Step 4: analytics UI** — CSS bars like old app: horizontal bars per category (width = share of max), vertical bars per month. No chart library. Month navigation via URL param.
- [ ] **Step 5: Navigation** — port old `Navigation.tsx`; active route via `$page.url.pathname`; sign-out `POST` form action `?/logout` — put logout action in root `+layout.server.ts`.
- [ ] **Step 6: verify** — dashboard matches data added in Task 4; analytics bars reflect DB aggregates; nav highlights active route; mobile viewport → bottom nav.
- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: dashboard + analytics pages with SQL aggregates"
```

---

### Task 6: AI Endpoints + Copilot

**Files:**
- Create: `src/routes/api/ai/parse/+server.ts`, `src/routes/api/ai/report/+server.ts`, `src/routes/copilot/+page.server.ts`, `src/routes/copilot/+page.svelte`

**Interfaces:**
- Consumes: `parseTransactions`, `reportAnswer` (Task 2); guard (Task 3 — 401 JSON path); `db.ts` summary functions.
- Produces: `POST /api/ai/parse` `{ text: string }` → `{ transactions: TxInput[] }` or `{ error: string }`; `POST /api/ai/report` `{ question: string }` → `{ answer: string }` or `{ error: string }`. Both check `Origin` header equals `event.url.origin` (CSRF), plus session already enforced by hooks.

- [ ] **Step 1: parse endpoint** — zod validate body; `parseTransactions(event.platform.env.GOOGLE_API_KEY, text)`; missing key → 503 `{ error: 'Fitur AI belum dikonfigurasi' }`; Gemini/quota/timeout errors → 502 `{ error: friendly message }` (map from old `ai.ts` error handling).
- [ ] **Step 2: report endpoint** — same error shape; builds summary JSON from `getMonthlySummary` + `getCategoryTotals` (current month) and passes to `reportAnswer`.
- [ ] **Step 3: copilot page** — port old `ai-copilot/page.tsx` (raw URL): two tabs — Parse (textarea → POST /api/ai/parse → preview cards with checkboxes → selected rows submitted via `TransactionForm`-compatible form action `?/create` on transactions route or a local `?/create-bulk` action in `copilot/+page.server.ts` calling `createTransaction` per row in a D1 batch) and Report (chat-style list, POST /api/ai/report, render answer + retry button on error). Indonesian copy. Loading state per request.
- [ ] **Step 4: verify** — with real `GOOGLE_API_KEY` in `.dev.vars`: parse "beli kopi 25rb tadi pagi" → one expense transaction preview; report answers with data-aware text; without key → 503 friendly message. `.dev.vars` gitignored (add to `.gitignore`).
- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: AI parse/report endpoints + copilot page"
```

---

### Task 7: PWA + Theme + Error Page

**Files:**
- Create: `static/manifest.json`, `static/sw.js`, `static/icons/` (copy icon files from old repo `public/`), `src/routes/+error.svelte`
- Modify: `src/app.html` (theme init script + SW registration + manifest link), `src/lib/components/ThemeToggle.svelte`, `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: navigation/layout from Task 5.
- Produces: installable PWA; class-based dark mode persisted in localStorage; global error page.

- [ ] **Step 1: manifest.json** — port old `public/manifest.json`, update `name`/`short_name` if desired, keep Indonesian `lang`, `display: standalone`, icons from old repo.
- [ ] **Step 2: sw.js** — minimal:

```js
const CACHE = 'ftv2-static-v1';
const ASSETS = ['/', '/manifest.json'];
self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
	self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
self.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
	e.respondWith(
		caches.match(e.request).then(
			(hit) =>
				hit ||
				fetch(e.request).then((res) => {
					if (url.origin === location.origin) {
						const copy = res.clone();
						caches.open(CACHE).then((c) => c.put(e.request, copy));
					}
					return res;
				})
		)
	);
});
```

Register in `app.html` inline script guarded by `if ('serviceWorker' in navigator)`. Network-only semantics for API (early return) and data pages revalidate on next load — matches "offline shell" scope.

- [ ] **Step 3: theme** — inline script in `app.html` `<head>`: read `localStorage.theme`, add `dark` class before paint (no flash). `ThemeToggle.svelte` toggles class + persists. Port old toggle visuals.
- [ ] **Step 4: +error.svelte** — Indonesian message + status code + link home.
- [ ] **Step 5: verify** — Lighthouse PWA installable; toggling theme persists across reload; `/xyz` shows error page.
- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: PWA shell, theme toggle, global error page"
```

---

### Task 8 (Batch B): README + Deploy Docs

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: final stack/config from Tasks 1–7 (ask builder session or read `wrangler.jsonc` + `package.json`).
- Produces: README documenting setup, dev, deploy, secrets — replacing the old repo's README content with v2 instructions (Workers, not Pages).

- [ ] **Step 1: write README** — sections: overview + features (minus OCR), tech stack, prerequisites (Node 20+, Cloudflare account, optional Gemini key), setup (D1 create → `wrangler.jsonc` database_id → `schema.sql` apply local+remote → `wrangler secret put` ×2), dev (`wrangler dev`), deploy (GitHub Actions or `npm run deploy`), env/secrets table, D1 binding table. English, concise.
- [ ] **Step 2: verify commands in README actually match `package.json` scripts.**
- [ ] **Step 3: Commit**

```bash
git add README.md && git commit -m "docs: README for v2 (Workers deploy, D1 setup)"
```

---

### Task 9: Review + Deploy Workflow + Final Verify

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: any files flagged by review

**Interfaces:**
- Consumes: everything above.
- Produces: CI deploy on push to `main`; clean review.

- [ ] **Step 1: reviewer pass (read-only)** — dispatch `reviewer` on the full diff vs spec: guard correctness (401 path, cookie flags), secret handling (no keys client-side), zod coverage on all inputs, schema untouched, no OCR remnants. Return findings as file:line list.
- [ ] **Step 2: apply fixes** — builder fixes findings, `npm run check && npm run test` green, commit.
- [ ] **Step 3: deploy.yml** — port old `deploy.yml`, Workers flavor:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run check && npm run test
      - run: npm run build
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Secrets `SESSION_SECRET`, `GOOGLE_API_KEY` set once via `wrangler secret put` (persist across deploys — no CI secret needed for them).

- [ ] **Step 4: final verification checklist**
  - `npm run check` + `npm run test` + `npm run build` all green
  - `npx wrangler deploy --dry-run` succeeds
  - Deploy to a staging/preview: setup password → CRUD → parse/report (with key) → PWA installable
  - Verify old D1 data visible (same database_id)

- [ ] **Step 5: Commit + merge**

```bash
git add -A && git commit -m "ci: workers deploy workflow"
git checkout main && git merge feature/svelte-rewrite && git push origin main
```

## Acceptance Criteria

1. All routes guarded; `/api/*` returns 401 JSON when unauthenticated; `/login` handles both setup and login modes.
2. Existing master password + existing D1 transactions work without migration.
3. Transactions CRUD via form actions with inline validation errors, confirm modal, toasts.
4. Dashboard shows current-month summary + 5 latest; analytics shows category + 6-month bars (SQL aggregates, no chart lib).
5. AI parse (preview → confirm) and report work against real Gemini key; friendly errors without key.
6. PWA installable, offline shell, dark/light theme persists.
7. `npm run check`, `npm run test` (auth suite passes), `npm run build` green; deploy workflow deploys to Workers on push to `main`.
8. No Tesseract.js, no `client-api.ts`, no next-on-pages anywhere.

## Verification / Tests

- `npm run test` — auth + parser unit suites
- `npm run check` — svelte-check + tsc
- `npm run build && npx wrangler dev` — manual checklist per task
- Final: staging deploy walkthrough (Task 9 Step 4)

## Git

- Branch: `feature/svelte-rewrite` off fresh `main` (repo initialized in Task 1).
- Conventional commits, one per task.

## Integration Notes

- Single workstream — no POST-PLAN. Old repo untouched; v2 binds the same D1 database via its `database_id`.
- Before merging to `main`: create GitHub repo, push, set Actions secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`, and run `wrangler secret put` for app secrets once.
- Old app can be retired after v2 is verified against the same database (rollback = redeploy old Pages project; D1 schema is shared and unchanged).
