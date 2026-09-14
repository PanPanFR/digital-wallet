# Graph Report - digital-wallet  (2026-09-14)

## Corpus Check
- 67 files · ~39,623 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .jsonc 1)

## Summary
- 416 nodes · 705 edges · 23 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d4ad9df0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transactions/+page.svelte
- db.ts
- auth.ts
- package.json
- ai.ts
- Finance Tracker v2 (Project)
- compilerOptions
- validation.ts
- manifest.json
- app.d.ts
- Implementation Plan: Mobile Home + Transactions Fix
- analytics/+page.svelte
- Architecture
- Data Model
- Design: Digital Wallet — Transformasi dari Finance Tracker
- Development
- settings/+page.server.ts
- AGENTS.md

## God Nodes (most connected - your core abstractions)
1. `@sveltejs/kit` - 14 edges
2. `getProviders()` - 12 edges
3. `Implementation Plan: Mobile Home + Transactions Fix` - 12 edges
4. `getActiveProviderId()` - 11 edges
5. `Finance Tracker v2 (Project)` - 11 edges
6. `listTransactions()` - 10 edges
7. `POST()` - 10 edges
8. `compilerOptions` - 10 edges
9. `Architecture` - 10 edges
10. `Design: Digital Wallet — Transformasi dari Finance Tracker` - 10 edges

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

## Communities (23 total, 0 thin omitted)

### Community 0 - "transactions/+page.svelte"
Cohesion: 0.06
Nodes (10): isMoreActive, isMoreOpen, secondaryMobileItems, AMOUNT_PRESETS, CATEGORIES, dateTime, idr, notify() (+2 more)

### Community 1 - "db.ts"
Cohesion: 0.06
Nodes (56): getConfigFromEnv(), addDebtPayment(), adjustWalletBalance(), BackupCounts, CategoryTotal, createDebt(), createTransaction(), createWallet() (+48 more)

### Community 2 - "auth.ts"
Cohesion: 0.16
Nodes (19): @sveltejs/kit, handle(), PUBLIC_PATHS, base64Decode(), base64Encode(), bytesToHex(), createSessionToken(), encoder (+11 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (43): dependencies, @fontsource-variable/plus-jakarta-sans, layerchart, @lucide/svelte, zod, devDependencies, svelte, svelte-check (+35 more)

### Community 4 - "ai.ts"
Cohesion: 0.16
Nodes (13): vitest, AiConfig, callChatCompletion(), chatAnswer(), extractContent(), mapStatusToFriendlyError(), calls, CFG (+5 more)

### Community 5 - "Finance Tracker v2 (Project)"
Cohesion: 0.09
Nodes (30): Database schema changes, Deployment, Manual deploy (fallback), Pipeline, Post-deploy checks, Rollback, What must exist in the Cloudflare account, Approved plans (not yet in `main`) (+22 more)

### Community 6 - "compilerOptions"
Cohesion: 0.13
Nodes (14): ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule (+6 more)

### Community 7 - "validation.ts"
Cohesion: 0.15
Nodes (17): todayISO(), BackupAiProviderSchema, backupAmount, BackupData, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId (+9 more)

### Community 8 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, categories, description, dir, display, icons, lang, name (+4 more)

### Community 9 - "app.d.ts"
Cohesion: 0.33
Nodes (5): App, Error, Locals, PageData, Platform

### Community 10 - "Implementation Plan: Mobile Home + Transactions Fix"
Cohesion: 0.10
Nodes (19): Acceptance Criteria, Context, Delegation Strategy, Dependencies, Files / Areas Likely Affected, Git, Implementation Plan: Mobile Home + Transactions Fix, Implementation Steps (+11 more)

### Community 11 - "analytics/+page.svelte"
Cohesion: 0.11
Nodes (12): formatIDR(), categoryChartHeight, expenseChart, hasMonthly, i(), idrCompact, monthLabel, reduceMotion (+4 more)

### Community 14 - "Architecture"
Cohesion: 0.20
Nodes (10): AI copilot, Architecture, Data access, Decisions not re-documented here, Frontend layering, PWA status: manifest yes, service worker no, Repository layout, Request flow & auth (+2 more)

### Community 16 - "Data Model"
Cohesion: 0.20
Nodes (10): `app_settings` (schema.sql:55-59), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, `debts` and `debt_payments` (schema.sql:31-53), ER overview, Migration history (`migrations/`), `rate_limits` (schema.sql:61-65) (+2 more)

### Community 17 - "Design: Digital Wallet — Transformasi dari Finance Tracker"
Cohesion: 0.18
Nodes (10): Data Model (schema.sql baru), Deploy via GitHub (satu kali setup), Design: Digital Wallet — Transformasi dari Finance Tracker, Goals, Keputusan Desain, Non-Goals, Rebrand Checklist, Risiko / Catatan (+2 more)

### Community 18 - "Development"
Cohesion: 0.25
Nodes (8): Daily workflow, Development, Environment variables & bindings, First-time setup, Prerequisites, Tests, Troubleshooting, Where local D1 state lives

### Community 19 - "settings/+page.server.ts"
Cohesion: 0.21
Nodes (19): zod, AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderFormSchema (+11 more)

### Community 22 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Deploy & env, Non-negotiable design rules, Schema changes, Tests: fake-Db, no live D1, Workflow conventions

## Knowledge Gaps
- **189 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 236 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@sveltejs/kit` connect `auth.ts` to `settings/+page.server.ts`, `db.ts`, `package.json`, `ai.ts`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `zod` connect `settings/+page.server.ts` to `db.ts`, `auth.ts`, `package.json`, `validation.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `transactions/+page.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.06274509803921569 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06418219461697723 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04541062801932367 - nodes in this community are weakly interconnected._
- **Should `Finance Tracker v2 (Project)` be split into smaller, more focused modules?**
  _Cohesion score 0.08739495798319327 - nodes in this community are weakly interconnected._