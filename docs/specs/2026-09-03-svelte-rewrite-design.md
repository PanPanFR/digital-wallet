# Design: Finance Tracker v2 — SvelteKit Rewrite

Date: 2026-09-03
Status: Approved (design reviewed section-by-section in chat)
Replaces: https://github.com/PanPanFR/finance-tracker (Next.js 15 + React 19)

## Goals

1. Lighter stack: smaller bundle, faster builds, no deployment workaround layer.
2. Overall simplification: fewer files, fewer abstractions, idiomatic framework patterns.
3. Feature parity with the old app, minus OCR receipt scanning (dropped by user decision).

## Non-Goals

- OCR receipt scanning (removed — Tesseract.js dropped).
- Any new features beyond parity.
- Multi-user support (stays single-user, master password).

## Stack Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | SvelteKit (Svelte 5, runes) | Pages + API in one project; official Cloudflare adapter; form actions and load functions eliminate client-side fetch/state boilerplate |
| Rendering | SSR via SvelteKit, deployed as static assets + Worker | Standard output of adapter-cloudflare |
| Hosting | Cloudflare Workers (static assets + API in one Worker) | Cloudflare's primary platform going forward; Pages is in maintenance mode; D1 binding and env vars live in config, not dashboard clicks |
| Database | Cloudflare D1 — **unchanged** | Same database, same `schema.sql`; all existing data works with no migration |
| Styling | Tailwind CSS v4 | Same as old app; port relevant parts of `globals.css` |
| Icons | lucide-svelte | Direct equivalent of lucide-react |
| Validation | zod (server-side) | Same as old app |
| Charts | Custom CSS bars | Old app has no chart library; analytics used CSS bars — keep that |
| State | Svelte runes/stores (`lib/stores.svelte.ts`) | Toast + theme only; no state library |
| PWA | Hand-rolled minimal service worker (~30 lines), no Workbox | Cache-first static assets, network-only data; installable + offline shell |

## Architecture

```
finance-tracker-v2/
├── src/
│   ├── hooks.server.ts          # global auth guard + rate limiting
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts            # D1 queries: transactions, app_settings, rate_limits
│   │   │   ├── auth.ts          # HMAC-SHA256 sessions + password hash (ported verbatim — format-compatible)
│   │   │   └── ai.ts            # Gemini: parse + report
│   │   ├── components/          # Svelte components: Toast, ConfirmModal, TransactionForm, Navigation, Skeleton, ThemeToggle
│   │   └── stores.svelte.ts     # toast + theme (runes)
│   ├── routes/
│   │   ├── +layout.svelte       # nav + PWA shell
│   │   ├── +error.svelte        # global error page
│   │   ├── +page.server.ts      # dashboard load: month summary + 5 latest transactions
│   │   ├── transactions/+page.server.ts + +page.svelte   # list + form actions: create/update/delete
│   │   ├── analytics/+page.server.ts + +page.svelte      # SQL GROUP BY aggregates, CSS bars
│   │   ├── copilot/+page.svelte                          # AI chat UI, fetches JSON endpoints
│   │   ├── login/+page.server.ts + +page.svelte          # setup (first run) or login, form actions
│   │   ├── settings/+page.server.ts + +page.svelte      # change password (form action)
│   │   └── api/ai/parse/+server.ts, api/ai/report/+server.ts  # JSON endpoints
│   ├── app.css
│   └── app.html
├── static/                      # manifest.json, icons, sw.js
├── wrangler.jsonc               # assets, D1 binding "DB", SESSION_SECRET + GOOGLE_API_KEY (secrets)
└── schema.sql                   # unchanged
```

## Auth Flow

```
Any request → hooks.server.ts
  ├─ excluded path (/login, and static assets) → pass through
  ├─ missing/invalid session cookie:
  │    ├─ path starts with /api/ → 401 JSON (never redirect)
  │    └─ otherwise → redirect /login
  └─ valid → pass through
```

- `/login` page, two modes: **setup** (no password in `app_settings` yet → set first password) or **login** (verify against stored hash). Form action issues HMAC session cookie.
- Change password in `/settings` form action; requires current password.
- Login rate limiting via D1 `rate_limits` table (ported logic — survives isolate restarts).
- CSRF: form actions are protected by SvelteKit built-ins. JSON AI endpoints check `Origin` header manually (replaces `csrf.ts`, shorter).

Security invariants preserved from old app: API keys server-only, session token HMAC-SHA256, password hashing format identical (existing master password keeps working, no reset needed).

## Data Flows

**CRUD (form actions):**
```
<form method="POST" action="?/create"> → action in +page.server.ts
  → zod validate → db.ts → revalidate
  failure: fail(400, {field errors}) → rendered inline
delete: <form> POST + ConfirmModal port
```
No `client-api.ts`, no manual fetch for CRUD, no client list-state. `invalidateAll()` refreshes data after mutations.

**AI (JSON endpoints, interactive):**
```
copilot page → POST /api/ai/parse {text} → Gemini → structured transaction JSON
             → user previews/confirms → POST ?/create form action per selected transaction
report       → POST /api/ai/report {question} → Gemini + D1 data → answer
```
AI parse stays JSON because results need interactive preview/confirmation before saving.

**Loads (server queries, no client fetching):**
- Dashboard: current-month summary + 5 latest transactions.
- Analytics: per-category/month aggregation via SQL `GROUP BY`; CSS bars client-side.

## UI

- Mobile-first layout as before: bottom nav (mobile) + sidebar (desktop); port `Navigation`.
- Dark/light theme toggle via CSS class, preference in localStorage; port `ThemeToggle`.
- Components ported from React: `Toast`, `ConfirmModal`, `TransactionForm`, `Skeleton` — each becomes shorter (no `use client`, no memoization).
- Modal accessibility: port `useModalAccessibility` (focus trap + ESC) as a Svelte action, one file, used by all modals.
- UI language: Indonesian (same as old app).

## PWA

- `manifest.json` + icons in `static/`.
- Minimal service worker: cache-first for static assets, network-only for data/API. Installable, offline shell. Data requires connectivity (same as old app).

## Error Handling

- Form validation failures: `fail(400, {field errors})` inline in the form; no toasts for validation.
- AI failures (missing key, quota, timeout): JSON `{error}` with a friendly message + retry button in UI.
- Unexpected errors: global `+error.svelte`; server-side console logging.

## Testing

- Unit tests (vitest): `lib/server/auth.ts` (hash/verify/token) and AI parser normalization (Gemini output → transactions) — the two highest-risk pure-logic modules. No D1 in unit tests.
- Everything else: manual verification checklist per feature (login, CRUD, AI, PWA install).
- CI: lint + `svelte-check` + `tsc`.

## Deployment

- `wrangler.jsonc`: static assets, D1 binding `DB`, secrets `SESSION_SECRET` + `GOOGLE_API_KEY`.
- GitHub Actions: push to `main` → `wrangler deploy` (ported `deploy.yml`, shorter — no next-on-pages step).
- Local dev: `wrangler dev` with local D1 + real bindings (not mocks).

## Risks

- SvelteKit form actions / load functions are new patterns for the user — mitigated by their explicit choice of the idiomatic path (Option B) and the simplification payoff.
- Svelte 5 runes differ from classic Svelte stores syntax — acceptable; small surface area here (toast + theme).
- D1/adapter-cloudflare compatibility — official adapter, low risk; verify early in implementation.
