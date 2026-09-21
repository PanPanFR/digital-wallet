# Graph Report - digital-wallet  (2026-09-21)

## Corpus Check
- 116 files · ~67,253 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 1252 edges · 64 communities (53 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2e312f2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transactions/+page.svelte
- server/db.ts
- server/auth.ts
- dependencies
- server/ai.ts
- Design: Digital Wallet — Transformasi dari Finance Tracker
- compilerOptions
- server/validation.ts
- manifest.json
- app.d.ts
- Implementation Plan: MVP Simplify + Mobile Hierarchy Fix
- analytics/+page.svelte
- Architecture
- Data Model
- settings.ts
- Development
- settings/+page.server.ts
- shared/validation.ts
- AGENTS.md
- devDependencies
- Debts.tsx
- worker/db.test.ts
- worker/db.ts
- index.ts
- Implementation Plan: React Core Features
- Implementation Plan: React Secondary Features + Cutover
- wallets
- worker/ai.ts
- Stack Decisions
- transactions.ts
- backup.ts
- Finance Tracker v2 (Project)
- wallets.ts
- Deployment
- SvelteKit Rewrite Design
- lib/format.ts
- wallets/+page.server.ts
- server/ai.test.ts
- export/+server.ts
- Documentation Index
- stores.svelte.ts
- login/+page.server.ts
- csv.ts
- hooks.server.ts
- lib/constants.ts
- report/+server.ts
- hutang/+page.server.ts
- routes/+page.server.ts
- transactions/+page.server.ts
- env.d.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `fieldErrors()` - 14 edges
3. `Implementation Plan: MVP Simplify + Mobile Hierarchy Fix` - 13 edges
4. `Env` - 12 edges
5. `Implementation Plan: React Core Features` - 12 edges
6. `Implementation Plan: React Secondary Features + Cutover` - 12 edges
7. `todayISO()` - 11 edges
8. `useToast()` - 11 edges
9. `Debts()` - 11 edges
10. `Finance Tracker v2 (Project)` - 11 edges

## Surprising Connections (you probably didn't know these)
- `App HTML Shell` --shares_data_with--> `App Icon (Rp on sky-blue)`  [INFERRED]
  src/app.html → static/icon.svg
- `Rupiah Currency Symbol` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `Finance Tracker v2 (Project)` --references--> `Auth Flow (hooks guard, setup/login, rate limit)`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md
- `App Icon (Rp on sky-blue)` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `Environment Bindings (DB, ASSETS, secrets)` --shares_data_with--> `Stack Decisions`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PWA Shell Flow (registration -> hand-rolled sw -> offline shell)** — src_app_html_shell, src_app_sw_registration_script, docs_specs_2026_09_03_svelte_rewrite_design_hand_rolled_service_worker [INFERRED 0.85]
- **Theme Persistence Flow (init script -> localStorage ft-theme -> CSS class)** — src_app_html_shell, src_app_theme_init_script, docs_specs_2026_09_03_svelte_rewrite_design_theme_toggle [INFERRED 0.85]

## Communities (64 total, 11 thin omitted)

### Community 0 - "transactions/+page.svelte"
Cohesion: 0.08
Nodes (4): isMoreActive, isMoreOpen, secondaryMobileItems, config

### Community 1 - "server/db.ts"
Cohesion: 0.05
Nodes (52): AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderFormSchema, resolveProviderConfig() (+44 more)

### Community 2 - "server/auth.ts"
Cohesion: 0.28
Nodes (12): base64Decode(), base64Encode(), bytesToHex(), createSessionToken(), encoder, getSessionSecret(), hashPassword(), hexToBytes() (+4 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (31): @fontsource-variable/plus-jakarta-sans, hono, lucide-react, dependencies, @fontsource-variable/plus-jakarta-sans, hono, lucide-react, react (+23 more)

### Community 4 - "server/ai.ts"
Cohesion: 0.43
Nodes (5): AiConfig, callChatCompletion(), chatAnswer(), extractContent(), mapStatusToFriendlyError()

### Community 5 - "Design: Digital Wallet — Transformasi dari Finance Tracker"
Cohesion: 0.18
Nodes (10): Data Model (schema.sql baru), Deploy via GitHub (satu kali setup), Design: Digital Wallet — Transformasi dari Finance Tracker, Goals, Keputusan Desain, Non-Goals, Rebrand Checklist, Risiko / Catatan (+2 more)

### Community 6 - "compilerOptions"
Cohesion: 0.06
Nodes (34): @cloudflare/workers-types, dist, DOM, DOM.Iterable, ES2022, node_modules, ./shared/*, shared/**/*.ts (+26 more)

### Community 7 - "server/validation.ts"
Cohesion: 0.14
Nodes (16): BackupAiProviderSchema, backupAmount, BackupData, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId, BackupSchema (+8 more)

### Community 8 - "manifest.json"
Cohesion: 0.12
Nodes (15): finance, productivity, utilities, background_color, categories, description, dir, display (+7 more)

### Community 9 - "app.d.ts"
Cohesion: 0.33
Nodes (5): App, Error, Locals, PageData, Platform

### Community 10 - "Implementation Plan: MVP Simplify + Mobile Hierarchy Fix"
Cohesion: 0.14
Nodes (13): Acceptance Criteria, Appendix: Global Stitch MCP (keyless record — secret never lands in repo), Context, Delegation Strategy, Dependencies, Files / Areas Likely Affected, Git, Implementation Plan: MVP Simplify + Mobile Hierarchy Fix (+5 more)

### Community 11 - "analytics/+page.svelte"
Cohesion: 0.09
Nodes (10): categoryChartHeight, expenseChart, hasMonthly, i(), idrCompact, monthLabel, reduceMotion, trendSeries (+2 more)

### Community 14 - "Architecture"
Cohesion: 0.20
Nodes (10): AI copilot, Architecture, Data access, Decisions not re-documented here, Frontend layering, PWA status: manifest yes, service worker no, Repository layout, Request flow & auth (+2 more)

### Community 16 - "Data Model"
Cohesion: 0.20
Nodes (10): `app_settings` (schema.sql:55-59), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, `debts` and `debt_payments` (schema.sql:31-53), ER overview, Migration history (`migrations/`), `rate_limits` (schema.sql:61-65) (+2 more)

### Community 17 - "settings.ts"
Cohesion: 0.11
Nodes (33): AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderApiSchema, ProviderFormSchema (+25 more)

### Community 18 - "Development"
Cohesion: 0.25
Nodes (8): Daily workflow, Development, Environment variables & bindings, First-time setup, Prerequisites, Tests, Troubleshooting, Where local D1 state lives

### Community 21 - "shared/validation.ts"
Cohesion: 0.13
Nodes (19): AdjustBalanceSchema, BackupAiProviderSchema, backupAmount, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId, BackupSchema (+11 more)

### Community 22 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Deploy & env, Non-negotiable design rules, Schema changes, Tests: fake-Db, no live D1, Workflow conventions

### Community 24 - "devDependencies"
Cohesion: 0.09
Nodes (23): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+15 more)

### Community 25 - "Debts.tsx"
Cohesion: 0.08
Nodes (53): AMOUNT_PRESETS, CATEGORIES, dateTime, formatDate(), formatIDR(), idr, todayISO(), DebtApiSchema (+45 more)

### Community 26 - "worker/db.test.ts"
Cohesion: 0.13
Nodes (14): addDebtPayment(), createDebt(), deleteDebt(), deleteDebts(), getDebt(), getDebtDirectionTotals(), listDebts(), listOpenDebts() (+6 more)

### Community 27 - "worker/db.ts"
Cohesion: 0.15
Nodes (21): AnalyticsData, ApiError, AuthStatus, DashboardData, BackupData, TransactionFormProps, DebtsResponse, TxResponse (+13 more)

### Community 28 - "index.ts"
Cohesion: 0.16
Nodes (16): ChatSchema, getCategoryTotals(), getKindTotals(), getMonthlySummary(), getMonthlyTotals(), getWalletTotals(), Env, app (+8 more)

### Community 29 - "Implementation Plan: React Core Features"
Cohesion: 0.15
Nodes (12): Acceptance Criteria, Context, Delegation Strategy, Dependencies, Files / Areas Likely Affected, Git (branch: feature/react-core-features), Implementation Plan: React Core Features, Implementation Steps (+4 more)

### Community 31 - "Implementation Plan: React Secondary Features + Cutover"
Cohesion: 0.15
Nodes (12): Acceptance Criteria, Context, Delegation Strategy, Dependencies, Files / Areas Likely Affected, Git (branch: feature/react-secondary-cutover), Implementation Plan: React Secondary Features + Cutover, Implementation Steps (+4 more)

### Community 32 - "wallets"
Cohesion: 0.26
Nodes (9): transactions_new, debt_payments, debts, app_settings, debt_payments, debts, rate_limits, transactions (+1 more)

### Community 33 - "worker/ai.ts"
Cohesion: 0.23
Nodes (9): AiConfig, callChatCompletion(), chatAnswer(), extractContent(), getConfigFromEnv(), mapStatusToFriendlyError(), calls, CFG (+1 more)

### Community 34 - "Stack Decisions"
Cohesion: 0.22
Nodes (9): Custom CSS Bars (no chart lib), D1 Database (unchanged), Form Actions + Load Functions Pattern, Hand-rolled Minimal Service Worker, Stack Decisions, Cloudflare Workers over Pages, Environment Bindings (DB, ASSETS, secrets), App HTML Shell (+1 more)

### Community 35 - "transactions.ts"
Cohesion: 0.29
Nodes (6): TxUpdateSchema, deleteTransaction(), deleteTransactions(), updateTransaction(), BulkDeleteSchema, transactionRoutes

### Community 36 - "backup.ts"
Cohesion: 0.31
Nodes (8): exportAllData(), listTransactions(), backupRoute, backupRoutes, CSV_COLUMNS, handleCsvExport(), handleJsonExport(), toCsvField()

### Community 37 - "Finance Tracker v2 (Project)"
Cohesion: 0.64
Nodes (3): Finance Tracker v2 (Project), App Icon (Rp on sky-blue), Rupiah Currency Symbol

### Community 38 - "wallets.ts"
Cohesion: 0.22
Nodes (10): adjustWalletBalance(), createTransaction(), createWallet(), deleteWallet(), getWalletBalances(), updateWallet(), walletNameExists(), AdjustSchema (+2 more)

### Community 39 - "Deployment"
Cohesion: 0.29
Nodes (7): Database schema changes, Deployment, Manual deploy (fallback), Pipeline, Post-deploy checks, Rollback, What must exist in the Cloudflare account

### Community 40 - "SvelteKit Rewrite Design"
Cohesion: 0.33
Nodes (7): AI JSON Endpoints (parse + report), Auth Flow (hooks guard, setup/login, rate limit), Next.js Finance Tracker (predecessor), OCR Receipt Scanning Dropped, SvelteKit Rewrite Design, Dark/Light Theme Persistence, Theme Init Script (no-FOUC)

### Community 42 - "wallets/+page.server.ts"
Cohesion: 0.33
Nodes (4): actions, AdjustSchema, DUP_ERRORS, InitialBalanceSchema

### Community 43 - "server/ai.test.ts"
Cohesion: 0.40
Nodes (3): calls, CFG, FetchCall

### Community 44 - "export/+server.ts"
Cohesion: 0.60
Nodes (3): CSV_COLUMNS, GET(), _toCsvField()

### Community 45 - "Documentation Index"
Cohesion: 0.50
Nodes (4): Approved plans (not yet in `main`), Documentation Index, Historical design specs (read-only), Reference & explanation

### Community 46 - "stores.svelte.ts"
Cohesion: 0.67
Nodes (3): notify(), removeToast(), toasts

## Knowledge Gaps
- **275 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+270 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fieldErrors()` connect `Debts.tsx` to `transactions.ts`, `backup.ts`, `wallets.ts`, `settings.ts`, `shared/validation.ts`, `worker/db.test.ts`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `Finance Tracker v2 (Project)` connect `Finance Tracker v2 (Project)` to `SvelteKit Rewrite Design`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `chatAnswer()` connect `worker/ai.ts` to `index.ts`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _275 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `transactions/+page.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `server/db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05200341005967604 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._