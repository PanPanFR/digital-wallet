# Graph Report - digital-wallet  (2026-09-21)

## Corpus Check
- 76 files · ~43,926 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 513 nodes · 1034 edges · 27 communities (25 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73024b3b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Analytics.tsx
- dependencies
- Design: Digital Wallet — Transformasi dari Finance Tracker
- compilerOptions
- manifest.json
- Implementation Plan: MVP Simplify + Mobile Hierarchy Fix
- Architecture
- Data Model
- index.ts
- Development
- validation.ts
- AGENTS.md
- devDependencies
- Debts.tsx
- db.ts
- wallets
- worker/ai.ts
- Stack Decisions
- Finance Tracker v2 (Project)
- Deployment
- SvelteKit Rewrite Design
- Documentation Index
- csv.ts
- env.d.ts

## God Nodes (most connected - your core abstractions)
1. `formatIDR()` - 22 edges
2. `get()` - 18 edges
3. `compilerOptions` - 17 edges
4. `post()` - 15 edges
5. `fieldErrors()` - 14 edges
6. `useToast()` - 13 edges
7. `Implementation Plan: MVP Simplify + Mobile Hierarchy Fix` - 13 edges
8. `Env` - 12 edges
9. `todayISO()` - 11 edges
10. `Debts()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Rupiah Currency Symbol` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `App Icon (Rp on sky-blue)` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `Finance Tracker v2 (Project)` --references--> `Auth Flow (hooks guard, setup/login, rate limit)`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md
- `Environment Bindings (DB, ASSETS, secrets)` --shares_data_with--> `Stack Decisions`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md
- `Finance Tracker v2 (Project)` --references--> `Next.js Finance Tracker (predecessor)`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md

## Import Cycles
- None detected.

## Communities (27 total, 2 thin omitted)

### Community 0 - "Analytics.tsx"
Cohesion: 0.15
Nodes (24): dateTime, formatIDR(), idr, CategoryBarChart(), CategoryBarChartProps, CustomTooltip(), CategoryDonutChart(), CategoryDonutChartProps (+16 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (33): @fontsource-variable/plus-jakarta-sans, hono, lucide-react, dependencies, @fontsource-variable/plus-jakarta-sans, hono, lucide-react, react (+25 more)

### Community 5 - "Design: Digital Wallet — Transformasi dari Finance Tracker"
Cohesion: 0.18
Nodes (10): Data Model (schema.sql baru), Deploy via GitHub (satu kali setup), Design: Digital Wallet — Transformasi dari Finance Tracker, Goals, Keputusan Desain, Non-Goals, Rebrand Checklist, Risiko / Catatan (+2 more)

### Community 6 - "compilerOptions"
Cohesion: 0.06
Nodes (32): @cloudflare/workers-types, dist, DOM, DOM.Iterable, ES2022, node_modules, ./shared/*, shared/**/*.ts (+24 more)

### Community 8 - "manifest.json"
Cohesion: 0.12
Nodes (15): finance, productivity, utilities, background_color, categories, description, dir, display (+7 more)

### Community 10 - "Implementation Plan: MVP Simplify + Mobile Hierarchy Fix"
Cohesion: 0.14
Nodes (13): Acceptance Criteria, Appendix: Global Stitch MCP (keyless record — secret never lands in repo), Context, Delegation Strategy, Dependencies, Files / Areas Likely Affected, Git, Implementation Plan: MVP Simplify + Mobile Hierarchy Fix (+5 more)

### Community 14 - "Architecture"
Cohesion: 0.33
Nodes (6): AI copilot, Architecture, Data access, Frontend layering, Request flow & auth, Runtime shape

### Community 16 - "Data Model"
Cohesion: 0.20
Nodes (10): `app_settings` (schema.sql:55-59), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, `debts` and `debt_payments` (schema.sql:31-53), ER overview, Migration history (`migrations/`), `rate_limits` (schema.sql:61-65) (+2 more)

### Community 17 - "index.ts"
Cohesion: 0.08
Nodes (48): ChatSchema, AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderApiSchema (+40 more)

### Community 18 - "Development"
Cohesion: 0.25
Nodes (8): Daily workflow, Development, Environment variables & bindings, First-time setup, Prerequisites, Tests, Troubleshooting, Where local D1 state lives

### Community 21 - "validation.ts"
Cohesion: 0.09
Nodes (27): todayISO(), AdjustBalanceSchema, BackupAiProviderSchema, backupAmount, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId (+19 more)

### Community 22 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Deploy & env, Non-negotiable design rules, Schema changes, Tests: fake-Db, no live D1, Workflow conventions

### Community 24 - "devDependencies"
Cohesion: 0.09
Nodes (23): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+15 more)

### Community 25 - "Debts.tsx"
Cohesion: 0.06
Nodes (66): AMOUNT_PRESETS, CATEGORIES, formatDate(), fieldErrors(), api(), ApiError, apiFetch, del() (+58 more)

### Community 26 - "db.ts"
Cohesion: 0.06
Nodes (54): AnalyticsData, ApiError, AuthStatus, DashboardData, BackupData, TransactionFormProps, DebtsResponse, TxResponse (+46 more)

### Community 32 - "wallets"
Cohesion: 0.26
Nodes (9): transactions_new, debt_payments, debts, app_settings, debt_payments, debts, rate_limits, transactions (+1 more)

### Community 33 - "worker/ai.ts"
Cohesion: 0.23
Nodes (9): AiConfig, callChatCompletion(), chatAnswer(), extractContent(), getConfigFromEnv(), mapStatusToFriendlyError(), calls, CFG (+1 more)

### Community 34 - "Stack Decisions"
Cohesion: 0.29
Nodes (7): Custom CSS Bars (no chart lib), D1 Database (unchanged), Form Actions + Load Functions Pattern, Hand-rolled Minimal Service Worker, Stack Decisions, Cloudflare Workers over Pages, Environment Bindings (DB, ASSETS, secrets)

### Community 37 - "Finance Tracker v2 (Project)"
Cohesion: 0.64
Nodes (3): Finance Tracker v2 (Project), App Icon (Rp on sky-blue), Rupiah Currency Symbol

### Community 39 - "Deployment"
Cohesion: 0.29
Nodes (7): Database schema changes, Deployment, Manual deploy (fallback), Pipeline, Post-deploy checks, Rollback, What must exist in the Cloudflare account

### Community 40 - "SvelteKit Rewrite Design"
Cohesion: 0.40
Nodes (6): AI JSON Endpoints (parse + report), Auth Flow (hooks guard, setup/login, rate limit), Next.js Finance Tracker (predecessor), OCR Receipt Scanning Dropped, SvelteKit Rewrite Design, Dark/Light Theme Persistence

### Community 45 - "Documentation Index"
Cohesion: 0.50
Nodes (4): Approved plans (not yet in `main`), Documentation Index, Historical design specs (read-only), Reference & explanation

## Knowledge Gaps
- **194 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fieldErrors()` connect `Debts.tsx` to `index.ts`, `db.ts`, `validation.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `formatIDR()` connect `Analytics.tsx` to `Debts.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `WalletRow` connect `db.ts` to `Debts.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `manifest.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._