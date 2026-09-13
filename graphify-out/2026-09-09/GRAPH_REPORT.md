# Graph Report - finance-tracker-v2  (2026-09-09)

## Corpus Check
- 59 files · ~25,673 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 323 nodes · 492 edges · 21 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5ac576b0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- format.ts
- db.ts
- auth.ts
- devDependencies
- ai.ts
- Stack Decisions
- compilerOptions
- package.json
- manifest.json
- app.d.ts
- wallets
- Data Model
- Architecture
- Development

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 10 edges
2. `Architecture` - 10 edges
3. `Design: Digital Wallet — Transformasi dari Finance Tracker` - 10 edges
4. `chatAnswer()` - 8 edges
5. `getWalletBalances()` - 8 edges
6. `listTransactions()` - 8 edges
7. `POST()` - 8 edges
8. `Data Model` - 8 edges
9. `scripts` - 7 edges
10. `wallets` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Rupiah Currency Symbol` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `App HTML Shell` --shares_data_with--> `App Icon (Rp on sky-blue)`  [INFERRED]
  src/app.html → static/icon.svg
- `App Icon (Rp on sky-blue)` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `Finance Tracker v2 (Project)` --references--> `Auth Flow (hooks guard, setup/login, rate limit)`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md
- `Environment Bindings (DB, ASSETS, secrets)` --shares_data_with--> `Stack Decisions`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PWA Shell Flow (registration -> hand-rolled sw -> offline shell)** — src_app_html_shell, src_app_sw_registration_script, docs_specs_2026_09_03_svelte_rewrite_design_hand_rolled_service_worker [INFERRED 0.85]
- **Theme Persistence Flow (init script -> localStorage ft-theme -> CSS class)** — src_app_html_shell, src_app_theme_init_script, docs_specs_2026_09_03_svelte_rewrite_design_theme_toggle [INFERRED 0.85]

## Communities (21 total, 0 thin omitted)

### Community 0 - "format.ts"
Cohesion: 0.08
Nodes (8): CATEGORIES, dateTime, idr, notify(), removeToast(), toasts, kind(), config

### Community 1 - "db.ts"
Cohesion: 0.07
Nodes (50): todayISO(), addDebtPayment(), CategoryTotal, createDebt(), createTransaction(), createWallet(), DebtPaymentRow, DebtRow (+42 more)

### Community 2 - "auth.ts"
Cohesion: 0.14
Nodes (23): handle(), PUBLIC_PATHS, base64Decode(), base64Encode(), bytesToHex(), createSessionToken(), encoder, getSessionSecret() (+15 more)

### Community 3 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, svelte, svelte-check, @sveltejs/adapter-cloudflare, @sveltejs/kit, @sveltejs/vite-plugin-svelte, tailwindcss, @tailwindcss/vite (+17 more)

### Community 4 - "ai.ts"
Cohesion: 0.27
Nodes (8): AiConfig, callChatCompletion(), chatAnswer(), extractContent(), getConfig(), mapStatusToFriendlyError(), calls, FetchCall

### Community 5 - "Stack Decisions"
Cohesion: 0.15
Nodes (19): AI JSON Endpoints (parse + report), Auth Flow (hooks guard, setup/login, rate limit), Custom CSS Bars (no chart lib), D1 Database (unchanged), Form Actions + Load Functions Pattern, Hand-rolled Minimal Service Worker, Next.js Finance Tracker (predecessor), OCR Receipt Scanning Dropped (+11 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (20): build, node_modules, src/**/*.svelte, src/**/*.test.ts, src/**/*.ts, .svelte-kit, ./.svelte-kit/tsconfig.json, compilerOptions (+12 more)

### Community 7 - "package.json"
Cohesion: 0.12
Nodes (16): @lucide/svelte, dependencies, @lucide/svelte, zod, name, private, scripts, build (+8 more)

### Community 8 - "manifest.json"
Cohesion: 0.12
Nodes (15): finance, productivity, utilities, background_color, categories, description, dir, display (+7 more)

### Community 9 - "app.d.ts"
Cohesion: 0.33
Nodes (5): App, Error, Locals, PageData, Platform

### Community 10 - "wallets"
Cohesion: 0.26
Nodes (9): transactions_new, debt_payments, debts, app_settings, debt_payments, debts, rate_limits, transactions (+1 more)

### Community 16 - "Data Model"
Cohesion: 0.22
Nodes (9): `app_settings` (schema.sql:27-31), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, ER overview, Planned schema changes, `rate_limits` (schema.sql:33-37), `transactions` (schema.sql:11-20) (+1 more)

### Community 17 - "Architecture"
Cohesion: 0.06
Nodes (31): AI copilot, Architecture, Data access, Decisions not re-documented here, Frontend layering, PWA status: manifest yes, service worker no, Repository layout, Request flow & auth (+23 more)

### Community 18 - "Development"
Cohesion: 0.25
Nodes (8): Daily workflow, Development, Environment variables & bindings, First-time setup, Prerequisites, Tests, Troubleshooting, Where local D1 state lives

## Knowledge Gaps
- **131 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+126 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `chatAnswer()` connect `ai.ts` to `db.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _131 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `format.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08392603129445235 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.075 - nodes in this community are weakly interconnected._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1425287356321839 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._