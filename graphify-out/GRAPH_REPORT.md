# Graph Report - finance-tracker-v2  (2026-09-13)

## Corpus Check
- 66 files · ~35,998 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 406 nodes · 665 edges · 22 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ceb27eab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- analytics/+page.svelte
- db.ts
- auth.ts
- devDependencies
- ai.ts
- Stack Decisions
- compilerOptions
- validation.ts
- manifest.json
- app.d.ts
- wallets
- Data Model
- Architecture
- settings/+page.server.ts
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `getProviders()` - 12 edges
2. `getActiveProviderId()` - 11 edges
3. `listTransactions()` - 10 edges
4. `POST()` - 10 edges
5. `compilerOptions` - 10 edges
6. `Architecture` - 10 edges
7. `Design: Digital Wallet — Transformasi dari Finance Tracker` - 10 edges
8. `getWalletBalances()` - 9 edges
9. `Data Model` - 9 edges
10. `getMonthlyTotals()` - 8 edges

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

## Communities (22 total, 0 thin omitted)

### Community 0 - "analytics/+page.svelte"
Cohesion: 0.05
Nodes (18): isMoreActive, isMoreOpen, secondaryMobileItems, AMOUNT_PRESETS, CATEGORIES, dateTime, idr, notify() (+10 more)

### Community 1 - "db.ts"
Cohesion: 0.06
Nodes (60): getConfigFromEnv(), addDebtPayment(), adjustWalletBalance(), BackupCounts, CategoryTotal, createDebt(), createTransaction(), createWallet() (+52 more)

### Community 2 - "auth.ts"
Cohesion: 0.19
Nodes (18): handle(), PUBLIC_PATHS, base64Decode(), base64Encode(), bytesToHex(), createSessionToken(), encoder, getSessionSecret() (+10 more)

### Community 3 - "devDependencies"
Cohesion: 0.04
Nodes (45): @fontsource-variable/plus-jakarta-sans, layerchart, @lucide/svelte, dependencies, @fontsource-variable/plus-jakarta-sans, layerchart, @lucide/svelte, zod (+37 more)

### Community 4 - "ai.ts"
Cohesion: 0.25
Nodes (8): AiConfig, callChatCompletion(), chatAnswer(), extractContent(), mapStatusToFriendlyError(), calls, CFG, FetchCall

### Community 5 - "Stack Decisions"
Cohesion: 0.15
Nodes (19): AI JSON Endpoints (parse + report), Auth Flow (hooks guard, setup/login, rate limit), Custom CSS Bars (no chart lib), D1 Database (unchanged), Form Actions + Load Functions Pattern, Hand-rolled Minimal Service Worker, Next.js Finance Tracker (predecessor), OCR Receipt Scanning Dropped (+11 more)

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (20): build, node_modules, src/**/*.svelte, src/**/*.test.ts, src/**/*.ts, .svelte-kit, ./.svelte-kit/tsconfig.json, compilerOptions (+12 more)

### Community 7 - "validation.ts"
Cohesion: 0.15
Nodes (17): todayISO(), BackupAiProviderSchema, backupAmount, BackupData, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId (+9 more)

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
Cohesion: 0.20
Nodes (10): `app_settings` (schema.sql:55-59), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, `debts` and `debt_payments` (schema.sql:31-53), ER overview, Migration history (`migrations/`), `rate_limits` (schema.sql:61-65) (+2 more)

### Community 17 - "Architecture"
Cohesion: 0.05
Nodes (39): AI copilot, Architecture, Data access, Decisions not re-documented here, Frontend layering, PWA status: manifest yes, service worker no, Repository layout, Request flow & auth (+31 more)

### Community 19 - "settings/+page.server.ts"
Cohesion: 0.22
Nodes (18): AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderFormSchema, resolveProviderConfig() (+10 more)

### Community 22 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Deploy & env, Non-negotiable design rules, Schema changes, Tests: fake-Db, no live D1, Workflow conventions

## Knowledge Gaps
- **168 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `chatAnswer()` connect `ai.ts` to `db.ts`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `getProviders()` connect `settings/+page.server.ts` to `db.ts`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `analytics/+page.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.05081967213114754 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05894736842105263 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `Stack Decisions` be split into smaller, more focused modules?**
  _Cohesion score 0.14619883040935672 - nodes in this community are weakly interconnected._