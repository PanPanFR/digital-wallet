# Graph Report - digital-wallet  (2026-09-21)

## Corpus Check
- 74 files · ~40,687 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 485 nodes · 1005 edges · 25 communities (22 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bffc7acf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Analytics.tsx
- settings.ts
- ThemeToggle.tsx
- dependencies
- db.ts
- Design: Digital Wallet — Transformasi dari Finance Tracker
- compilerOptions
- index.ts
- manifest.json
- wallets.ts
- transactions.ts
- Data Model
- backup.ts
- validation.ts
- AGENTS.md
- devDependencies
- Debts.tsx
- db.test.ts
- wallets
- routes/ai.ts
- Environment Bindings (DB, ASSETS, secrets)
- env.d.ts

## God Nodes (most connected - your core abstractions)
1. `formatIDR()` - 22 edges
2. `get()` - 18 edges
3. `compilerOptions` - 17 edges
4. `post()` - 15 edges
5. `fieldErrors()` - 14 edges
6. `useToast()` - 13 edges
7. `Env` - 12 edges
8. `todayISO()` - 11 edges
9. `Debts()` - 11 edges
10. `del()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Rupiah Currency Symbol` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `App Icon (Rp on sky-blue)` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `transactions_new` --references--> `wallets`  [EXTRACTED]
  migrations/001-tx-date-transfer.sql → schema.sql
- `CustomTooltip()` --calls--> `formatIDR()`  [EXTRACTED]
  web/src/components/charts/CategoryBarChart.tsx → shared/format.ts
- `CustomTooltip()` --calls--> `formatIDR()`  [EXTRACTED]
  web/src/components/charts/CategoryDonutChart.tsx → shared/format.ts

## Import Cycles
- None detected.

## Communities (25 total, 3 thin omitted)

### Community 0 - "Analytics.tsx"
Cohesion: 0.15
Nodes (24): dateTime, formatIDR(), idr, CategoryBarChart(), CategoryBarChartProps, CustomTooltip(), CategoryDonutChart(), CategoryDonutChartProps (+16 more)

### Community 1 - "settings.ts"
Cohesion: 0.11
Nodes (33): AiProvider, AiProviderSummary, getActiveProviderId(), getProviders(), isValidProvider(), parseProviders(), ProviderApiSchema, ProviderFormSchema (+25 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (33): @fontsource-variable/plus-jakarta-sans, hono, lucide-react, dependencies, @fontsource-variable/plus-jakarta-sans, hono, lucide-react, react (+25 more)

### Community 4 - "db.ts"
Cohesion: 0.18
Nodes (18): AnalyticsData, ApiError, AuthStatus, BackupData, TransactionFormProps, TxResponse, BackupCounts, CategoryTotal (+10 more)

### Community 5 - "Design: Digital Wallet — Transformasi dari Finance Tracker"
Cohesion: 0.06
Nodes (38): AI copilot, Architecture, Data access, Frontend layering, Request flow & auth, Runtime shape, Database schema changes, Deployment (+30 more)

### Community 6 - "compilerOptions"
Cohesion: 0.06
Nodes (32): @cloudflare/workers-types, dist, DOM, DOM.Iterable, ES2022, node_modules, ./shared/*, shared/**/*.ts (+24 more)

### Community 7 - "index.ts"
Cohesion: 0.16
Nodes (14): getCategoryTotals(), getKindTotals(), getMonthlySummary(), getMonthlyTotals(), getWalletTotals(), Env, app, aiRoutes (+6 more)

### Community 8 - "manifest.json"
Cohesion: 0.12
Nodes (15): finance, productivity, utilities, background_color, categories, description, dir, display (+7 more)

### Community 9 - "wallets.ts"
Cohesion: 0.22
Nodes (10): adjustWalletBalance(), createTransaction(), createWallet(), deleteWallet(), getWalletBalances(), updateWallet(), walletNameExists(), AdjustSchema (+2 more)

### Community 10 - "transactions.ts"
Cohesion: 0.29
Nodes (6): TxUpdateSchema, deleteTransaction(), deleteTransactions(), updateTransaction(), BulkDeleteSchema, transactionRoutes

### Community 16 - "Data Model"
Cohesion: 0.20
Nodes (10): `app_settings` (schema.sql:55-59), Computed balances (no stored balance anywhere), `created_at` format gotcha, Data Model, `debts` and `debt_payments` (schema.sql:31-53), ER overview, Migration history (`migrations/`), `rate_limits` (schema.sql:61-65) (+2 more)

### Community 17 - "backup.ts"
Cohesion: 0.33
Nodes (7): CSV_COLUMNS, toCsvField(), exportAllData(), listTransactions(), backupRoute, handleCsvExport(), handleJsonExport()

### Community 21 - "validation.ts"
Cohesion: 0.13
Nodes (21): todayISO(), AdjustBalanceSchema, BackupAiProviderSchema, backupAmount, backupDate, BackupDebtPaymentSchema, BackupDebtSchema, backupId (+13 more)

### Community 22 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Deploy & env, Non-negotiable design rules, Schema changes, Tests: fake-Db, no live D1, Workflow conventions

### Community 24 - "devDependencies"
Cohesion: 0.09
Nodes (23): @cloudflare/workers-types, devDependencies, @cloudflare/workers-types, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+15 more)

### Community 25 - "Debts.tsx"
Cohesion: 0.06
Nodes (67): AMOUNT_PRESETS, CATEGORIES, formatDate(), DashboardData, fieldErrors(), api(), ApiError, apiFetch (+59 more)

### Community 26 - "db.test.ts"
Cohesion: 0.13
Nodes (14): addDebtPayment(), createDebt(), deleteDebt(), deleteDebts(), getDebt(), getDebtDirectionTotals(), listDebts(), listOpenDebts() (+6 more)

### Community 32 - "wallets"
Cohesion: 0.26
Nodes (9): transactions_new, debt_payments, debts, app_settings, debt_payments, debts, rate_limits, transactions (+1 more)

### Community 33 - "routes/ai.ts"
Cohesion: 0.17
Nodes (12): ChatSchema, AiConfig, callChatCompletion(), chatAnswer(), extractContent(), getConfigFromEnv(), mapStatusToFriendlyError(), calls (+4 more)

## Knowledge Gaps
- **179 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+174 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fieldErrors()` connect `Debts.tsx` to `settings.ts`, `wallets.ts`, `transactions.ts`, `backup.ts`, `validation.ts`, `db.test.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `formatIDR()` connect `Analytics.tsx` to `Debts.tsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `WalletRow` connect `db.ts` to `Debts.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _179 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `settings.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10993657505285412 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Should `Design: Digital Wallet — Transformasi dari Finance Tracker` be split into smaller, more focused modules?**
  _Cohesion score 0.05708245243128964 - nodes in this community are weakly interconnected._