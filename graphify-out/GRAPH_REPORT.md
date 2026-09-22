# Graph Report - digital-wallet  (2026-09-22)

## Corpus Check
- 68 files · ~39,839 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 467 nodes · 921 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41f53532`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Implementation Plan: Tidy Transactions Filter Form + Remove Analytics Feature
- settings.ts
- Navigation.tsx
- dependencies
- Design: Digital Wallet — Transformasi dari Finance Tracker
- compilerOptions
- manifest.json
- Data Model
- aiProviders.ts
- validation.ts
- AGENTS.md
- devDependencies
- Debts.tsx
- db.ts
- wallets
- routes/ai.ts
- Environment Bindings (DB, ASSETS, secrets)
- env.d.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `get()` - 16 edges
3. `post()` - 15 edges
4. `fieldErrors()` - 14 edges
5. `useToast()` - 13 edges
6. `todayISO()` - 11 edges
7. `Debts()` - 11 edges
8. `Env` - 11 edges
9. `Implementation Plan: Tidy Transactions Filter Form + Remove Analytics Feature` - 11 edges
10. `formatIDR()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Rupiah Currency Symbol` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `App Icon (Rp on sky-blue)` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `transactions_new` --references--> `wallets`  [EXTRACTED]
  migrations/001-tx-date-transfer.sql → schema.sql
- `TxResponse` --references--> `TxRow`  [EXTRACTED]
  web/src/pages/Transactions.tsx → worker/db.ts
- `debts` --references--> `wallets`  [EXTRACTED]
  migrations/002-debts.sql → schema.sql

## Import Cycles
- None detected.

## Communities (21 total, 2 thin omitted)

### Community 0 - "Implementation Plan: Tidy Transactions Filter Form + Remove Analytics Feature"
Cohesion: 0.11
Nodes (18): Acceptance Criteria, Context, Dependencies, Files / Areas Likely Affected, Git (branch: feature/tidy-filter-remove-analytics), Implementation Plan: Tidy Transactions Filter Form + Remove Analytics Feature, Implementation Steps, Integration Notes (+10 more)

### Community 1 - "settings.ts"
Cohesion: 0.17
Nodes (21): base64Decode(), base64Encode(), bytesToHex(), createSessionToken(), encoder, getSessionSecret(), hashPassword(), hexToBytes() (+13 more)

### Community 2 - "Navigation.tsx"
Cohesion: 0.28
Nodes (7): items, Navigation(), NavItem, primaryMobileItems, secondaryMobileItems, syncThemeColor(), ThemeToggle()

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (31): @fontsource-variable/plus-jakarta-sans, hono, lucide-react, dependencies, @fontsource-variable/plus-jakarta-sans, hono, lucide-react, react (+23 more)

### Community 5 - "Design: Digital Wallet — Transformasi dari Finance Tracker"
Cohesion: 0.06
Nodes (38): AI copilot, Architecture, Data access, Frontend layering, Request flow & auth, Runtime shape, Database schema changes, Deployment (+30 more)

### Community 6 - "compilerOptions"
Cohesion: 0.06
Nodes (32): @cloudflare/workers-types, dist, DOM, DOM.Iterable, ES2022, node_modules, ./shared/*, shared/**/*.ts (+24 more)

### Community 8 - "manifest.json"
Cohesion: 0.12
Nodes (15): finance, productivity, utilities, background_color, categories, description, dir, display (+7 more)

### Community 16 - "Data Model"
Cohesion: 0.20
Nodes (10): `app_settings` (schema.sql:55-59), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, `debts` and `debt_payments` (schema.sql:31-53), ER overview, Migration history (`migrations/`), `rate_limits` (schema.sql:61-65) (+2 more)

### Community 17 - "aiProviders.ts"
Cohesion: 0.13
Nodes (23): AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderApiSchema, ProviderFormSchema (+15 more)

### Community 21 - "validation.ts"
Cohesion: 0.09
Nodes (25): AdjustBalanceSchema, BackupAiProviderSchema, backupAmount, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId, BackupSchema (+17 more)

### Community 22 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Deploy & env, Non-negotiable design rules, Schema changes, Tests: fake-Db, no live D1, Workflow conventions

### Community 24 - "devDependencies"
Cohesion: 0.09
Nodes (23): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+15 more)

### Community 25 - "Debts.tsx"
Cohesion: 0.07
Nodes (63): AMOUNT_PRESETS, CATEGORIES, dateTime, formatDate(), formatIDR(), idr, todayISO(), DebtApiSchema (+55 more)

### Community 26 - "db.ts"
Cohesion: 0.07
Nodes (48): ApiError, AuthStatus, DashboardData, BackupData, TransactionFormProps, DebtsResponse, TxResponse, addDebtPayment() (+40 more)

### Community 32 - "wallets"
Cohesion: 0.26
Nodes (9): transactions_new, debt_payments, debts, app_settings, debt_payments, debts, rate_limits, transactions (+1 more)

### Community 33 - "routes/ai.ts"
Cohesion: 0.15
Nodes (14): ChatSchema, AiConfig, callChatCompletion(), chatAnswer(), extractContent(), getConfigFromEnv(), mapStatusToFriendlyError(), calls (+6 more)

## Knowledge Gaps
- **187 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+182 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fieldErrors()` connect `Debts.tsx` to `aiProviders.ts`, `db.ts`, `validation.ts`, `settings.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `WalletRow` connect `db.ts` to `Debts.tsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _187 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Implementation Plan: Tidy Transactions Filter Form + Remove Analytics Feature` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Design: Digital Wallet — Transformasi dari Finance Tracker` be split into smaller, more focused modules?**
  _Cohesion score 0.05708245243128964 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._