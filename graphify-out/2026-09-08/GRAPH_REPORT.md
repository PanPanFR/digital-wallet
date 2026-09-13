# Graph Report - finance-tracker-v2  (2026-09-08)

## Corpus Check
- Corpus is ~12,732 words - fits in a single context window. You may not need a graph.

## Summary
- 236 nodes · 327 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.86)
- Token cost: 7,100 input · 3,400 output

## Community Hubs (Navigation)
- UI Components & Formatting
- Transaction DB Service
- Auth & Session
- Dev Dependencies
- AI Parsing Service
- Design Decisions
- TypeScript Config
- Package Manifest
- PWA Manifest
- App Type Definitions
- Database Schema
- Service Worker

## God Nodes (most connected - your core abstractions)
1. `parseTransactions()` - 10 edges
2. `compilerOptions` - 10 edges
3. `reportAnswer()` - 8 edges
4. `Finance Tracker v2 (Project)` - 8 edges
5. `SvelteKit Rewrite Design` - 8 edges
6. `scripts` - 7 edges
7. `createSessionToken()` - 7 edges
8. `verifySessionToken()` - 7 edges
9. `Stack Decisions` - 7 edges
10. `hashPassword()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Rupiah Currency Symbol` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `App Icon (Rp on sky-blue)` --conceptually_related_to--> `Finance Tracker v2 (Project)`  [INFERRED]
  static/icon.svg → README.md
- `App HTML Shell` --shares_data_with--> `App Icon (Rp on sky-blue)`  [INFERRED]
  src/app.html → static/icon.svg
- `CI Quality Gate (check + test)` --references--> `Finance Tracker v2 (Project)`  [INFERRED]
  .github/workflows/deploy.yml → README.md
- `Finance Tracker v2 (Project)` --references--> `Auth Flow (hooks guard, setup/login, rate limit)`  [INFERRED]
  README.md → docs/specs/2026-09-03-svelte-rewrite-design.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Deployment Pipeline (push main -> check/test -> build -> wrangler deploy)** — _github_workflows_deploy_deploy_workflow, _github_workflows_deploy_ci_quality_gate, _github_workflows_deploy_wrangler_deploy_step [EXTRACTED 1.00]
- **PWA Shell Flow (registration -> hand-rolled sw -> offline shell)** — src_app_html_shell, src_app_sw_registration_script, docs_specs_2026_09_03_svelte_rewrite_design_hand_rolled_service_worker [INFERRED 0.85]
- **Theme Persistence Flow (init script -> localStorage ft-theme -> CSS class)** — src_app_html_shell, src_app_theme_init_script, docs_specs_2026_09_03_svelte_rewrite_design_theme_toggle [INFERRED 0.85]

## Communities (16 total, 1 thin omitted)

### Community 0 - "UI Components & Formatting"
Cohesion: 0.08
Nodes (7): CATEGORIES, dateTime, idr, notify(), removeToast(), toasts, config

### Community 1 - "Transaction DB Service"
Cohesion: 0.11
Nodes (23): CategoryTotal, createTransaction(), createTransactions(), deleteTransaction(), getCategoryTotals(), getMonthlySummary(), getMonthlyTotals(), hitRateLimit() (+15 more)

### Community 2 - "Auth & Session"
Cohesion: 0.15
Nodes (22): handle(), PUBLIC_PATHS, base64Decode(), base64Encode(), bytesToHex(), createSessionToken(), encoder, getSessionSecret() (+14 more)

### Community 3 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, svelte, svelte-check, @sveltejs/adapter-cloudflare, @sveltejs/kit, @sveltejs/vite-plugin-svelte, tailwindcss, @tailwindcss/vite (+17 more)

### Community 4 - "AI Parsing Service"
Cohesion: 0.15
Nodes (17): AiConfig, callChatCompletion(), extractContent(), getConfig(), mapStatusToFriendlyError(), normalizeItem(), ParsedTransaction, parseJsonLoose() (+9 more)

### Community 5 - "Design Decisions"
Cohesion: 0.14
Nodes (22): CI Quality Gate (check + test), Deploy Workflow, Wrangler Deploy Step, AI JSON Endpoints (parse + report), Auth Flow (hooks guard, setup/login, rate limit), Custom CSS Bars (no chart lib), D1 Database (unchanged), Form Actions + Load Functions Pattern (+14 more)

### Community 6 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): build, node_modules, src/**/*.svelte, src/**/*.test.ts, src/**/*.ts, .svelte-kit, ./.svelte-kit/tsconfig.json, compilerOptions (+12 more)

### Community 7 - "Package Manifest"
Cohesion: 0.12
Nodes (16): @lucide/svelte, dependencies, @lucide/svelte, zod, name, private, scripts, build (+8 more)

### Community 8 - "PWA Manifest"
Cohesion: 0.12
Nodes (15): finance, productivity, utilities, background_color, categories, description, dir, display (+7 more)

### Community 9 - "App Type Definitions"
Cohesion: 0.33
Nodes (5): App, Error, Locals, PageData, Platform

### Community 10 - "Database Schema"
Cohesion: 0.50
Nodes (3): app_settings, rate_limits, transactions

## Knowledge Gaps
- **91 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Dev Dependencies` to `Package Manifest`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `getMonthlySummary()` connect `Transaction DB Service` to `AI Parsing Service`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `Finance Tracker v2 (Project)` (e.g. with `CI Quality Gate (check + test)` and `Auth Flow (hooks guard, setup/login, rate limit)`) actually correct?**
  _`Finance Tracker v2 (Project)` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Components & Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.0773109243697479 - nodes in this community are weakly interconnected._
- **Should `Transaction DB Service` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._