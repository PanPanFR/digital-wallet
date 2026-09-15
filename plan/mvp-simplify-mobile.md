# Implementation Plan: MVP Simplify + Mobile Hierarchy Fix

## Objective

Cut the app back to a cash/e-wallet money ledger MVP and fix the broken mobile hierarchy, without touching Copilot/Settings/Auth and without any DB migration.

Agreed MVP (from user, Indonesian source translated):
- MUST live: Wallets (digital + cash), money in/out monitoring, history (riwayat), Copilot (kept exactly as-is).
- MUST die (hide first, delete later): Hutang (debts), Analytics page, 6-month trend chart, transfer type, bulk-select, day-bars, Wawasan insight block.
- Flow: enter initial balance per wallet (e-wallet + cash) -> then only add (income) or subtract (expense). No wallet-to-wallet transfer in UI.
- Mobile: everything feels wrong (dashboard order, bottom nav, form density). Fix hierarchy mobile-first; visual polish via template / Google Stitch later (this plan is NOT blocked on the Stitch API key).

## Scope

IN:
- Dashboard (`/`): new order Total -> Catat actions -> Digital/Cash -> Dompet list -> Transaksi Terakhir. Delete Wawasan, Tren 6 Bulan, hutang card, 4-tile quick actions.
- Navigation (`Navigation.svelte`): remove Hutang + Analitik everywhere (desktop, mobile pill, Lainnya sheet); fix duplicated Analitik link (currently in primary list AND sheet). Mobile pill becomes Beranda / Transaksi / Dompet + center FAB Catat + Lainnya (Copilot + Settings only).
- Transactions page: remove bulk-select UI, day-bars, client typeFilter chips. Keep server filters month + search + `?wallet=` deep-link, limit 50 + offset paging.
- TransactionForm: income/expense only in UI (no transfer option), default expense, big amount + Rp prefix, grouped wallet select, 8 category chips (kept: Copilot context depends on them), date defaults today WIB, description. Mobile sheet variant, 44px targets.
- Wallets page: keep CRUD + "Atur Saldo" (posts `Penyesuaian saldo` adjustment transaction). Add optional initial-balance input on create (implemented via existing adjust pattern, NOT a new column).
- Server loads: trim dashboard `load` to totals + wallets + recent 5 + month income/expense. Stop calling trend (`getMonthlyTotals`), debt totals (`getDebtDirectionTotals`/`listOpenDebts`), category totals for dashboard. Keep `db.ts` functions untouched (dormant, zero backend risk).
- Dormant routes: `/hutang` and `/analytics` stay on disk, reachable by URL, but unlinked from all nav/cards/tiles. No redirect (avoids breaking change). Full deletion is a follow-up cleanup plan.

OUT (explicitly frozen, do NOT touch):
- `/copilot`, `/api/ai/report`, `ai.ts`, `aiProviders.ts`, `/settings` (password + AI provider CRUD + backup/restore), `hooks.server.ts`, `auth.ts`, `session.ts`, `validation.ts` transfer/debt schemas (server validation stays permissive; UI just stops offering transfer), `schema.sql`, `migrations/`, `wrangler.jsonc`, theme tokens in `app.css` (no Catppuccin redesign, no gradients, no new CSS framework, no new npm dep).
- No LayerChart removal from `package.json` (leave dep installed; just remove imports from dashboard/transactions to avoid lockfile churn).

## Context

Stack: SvelteKit 2 + Svelte 5 runes, TypeScript strict, Tailwind CSS 4 (no config file, via `@tailwindcss/vite`, class-based `dark` variant), one Cloudflare Worker (`@sveltejs/adapter-cloudflare`) + D1 (`digital-wallet-db`). UI copy Indonesian; code/docs English.

Non-negotiable repo rules (from `AGENTS.md`):
- Balances are computed, never stored (`BALANCE_SQL` in `src/lib/server/db.ts`). Never add a balance column. Saldo awal = one adjustment transaction (`adjustWalletBalance`, description `Penyesuaian saldo`).
- All SQL lives in `src/lib/server/db.ts`, first arg `D1Database`. Keep D1 out of client code.
- zod validation server-side is the single source of truth (`src/lib/server/validation.ts`). Every money path goes through it.
- Mutations use SvelteKit form actions + `invalidateAll()`, never hand-rolled `fetch` (except copilot `/api/ai/report`).
- Styling via `src/app.css` utilities (`.card`, `.btn*`, `.input`, `.chip`, `.page-header`, `.section-header`, `.list`, `.list-row`, `.tile`). Solid fills only, no gradients. Mobile safe-area `pb-[env(safe-area-inset-bottom)]`. Modals/sheets via `ModalShell` (`variant="center" | "sheet"`). Charts themed via `.lc-root-container` vars (we remove chart usage on dashboard; do not add chart CSS).
- Tests are server-side vitest only (`src/**/*.test.ts`, fake-Db for SQL). Route/UI verified manually. Verification = `npm run check && npm run test`.
- `graphify-out/` exists: run `graphify query` before manual browsing for recon, `graphify update .` after code changes.

Current pain (measured, not guessed):
- `+page.svelte` 398 lines: month picker + Catat + Total + 4-tile actions + Wawasan + Digital/Cash + Trend BarChart + debt card + Dompet grouped + Recent. Too many competing H2s on a 360px column.
- `transactions/+page.svelte` 500 lines: bulk-select state machine + indeterminate checkbox + day-bars derived block + typeFilter + full table. Thumb-unfriendly.
- `analytics/+page.svelte` 425 lines of LayerChart donut/bar + budgetPct math. Dormant after this plan.
- `Navigation.svelte` 199 lines: 7 items split primary/secondary, Analitik duplicated in pill slice AND Lainnya sheet, secondary (Hutang/Copilot/Settings) hidden behind sheet with no hint.

## Dependencies

- No new env vars, no secrets, no migration, no deploy-config change.
- Stitch API key NOT required for this plan. Stitch/MCP work (if the key arrives) happens as a later visual-mapping pass on top of the clean hierarchy built here. Builder must leave semantic section structure (`aria-label` regions as today) so a Stitch screen can be mapped 1:1 later.
- `docs/` has no PRD / api-spec / ui-ux / ADR for the MVP (only `architecture.md`, `data-model.md`, old `specs/*`). This plan IS the MVP scope record until the user writes a PRD. Do not invent product requirements beyond this file.
- Local D1 state in `.wrangler/state/` is shared by dev/preview; reset via `npx wrangler d1 execute digital-wallet-db --local --file=schema.sql` if needed. Never use `--remote` in this plan.

## Files / Areas Likely Affected

- `src/routes/+page.svelte` (hierarchy rebuild, remove BarChart/Wawasan/trend/debt/quick-tiles)
- `src/routes/+page.server.ts` (trim load: drop trend + debt + category calls; keep totals + wallets + recent + monthly summary)
- `src/lib/components/Navigation.svelte` (remove Hutang/Analitik, dedupe sheet, 3-item pill + FAB + Lainnya)
- `src/routes/transactions/+page.svelte` (remove bulk UI, day-bars, typeFilter chips; keep month/search/wallet filters + paging)
- `src/routes/transactions/+page.server.ts` (no logic change expected; only remove anything feeding deleted UI blocks, if any)
- `src/lib/components/TransactionForm.svelte` (income/expense only, default expense, keep WalletSelect + categories + WIB date default)
- `src/routes/wallets/+page.svelte` + `+page.server.ts` (optional initial-balance on create via adjust pattern; keep Atur Saldo, duplicate-name + has-transactions guards)
- `src/app.css` (spacing/hierarchy tweaks ONLY if needed; no token redesign)
- Dormant, untouched on disk: `src/routes/hutang/**`, `src/routes/analytics/**`, `src/lib/server/db.ts` (no SQL change), `src/lib/server/validation.ts` (no schema change), copilot/settings/api routes.
- Explicitly NOT touched: `schema.sql`, `migrations/`, `wrangler.jsonc`, `package.json` (no dep add/remove), `static/`.

## Implementation Steps

1. Trim dashboard server load. In `src/routes/+page.server.ts`: keep `getKindTotals`, wallet list with computed balances, `recent` (limit 5), `getMonthlySummary` (income/expense for selected month). Remove calls to `getMonthlyTotals`, debt totals, `getCategoryTotals` for this page. Do not delete the functions in `db.ts`. Confirm no other component imports the removed load fields.
2. Rebuild dashboard UI hierarchy (`+page.svelte`). New vertical order, one H1 only: (a) Total Saldo card, (b) two big thumb actions [Catat Pemasukan] [Catat Pengeluaran] (open the same TransactionForm with preset type; keep existing `open-transaction-form` window event for the FAB), (c) Digital/Tunai 2-col, (d) Dompet grouped list, (e) Transaksi Terakhir + Lihat semua. Delete: 4-tile quick-action grid, Wawasan section, Tren 6 Bulan section (+ `BarChart` import, `trendSeries`, `compactIDR`, `monthShort` helpers if now unused), debt summary card. Keep month `<input type="month">` (cheap, needed for in/out monitoring). Keep empty-states. Keep `aria-label` regions so Stitch mapping stays 1:1 later.
3. Simplify `Navigation.svelte`. Item list becomes: Beranda `/`, Transaksi `/transactions`, Dompet `/wallets` (primary); Copilot `/copilot`, Pengaturan `/settings` (secondary in Lainnya sheet). Delete Hutang + Analitik entries and the hardcoded duplicate Analitik block in the sheet. Mobile pill: 2 links + FAB + 1 link + Lainnya (5 slots preserved, no layout change). Desktop sidebar: same 5 links. Keep ThemeToggle + logout + `afterNavigate` close + safe-area padding.
4. Simplify transactions page UI. Remove: row checkboxes + header select-all + `selected`/`indeterminate` effects + bulk confirm modal + bulkDelete form wiring (leave the server `bulkDelete` action dormant), day-bars derived block + markup, `typeFilter` chips + `visible`/`monthIncome`/`monthExpense` client aggregates if they only fed deleted UI (keep what the remaining list actually renders). Keep: month filter, description search, `?wallet=` deep-link filter, 50/page offset paging, edit/delete per row (ConfirmModal), empty-state. No change to `listTransactions` SQL.
5. Simplify `TransactionForm.svelte` to income/expense. Remove transfer-type radio/option and `to_wallet_id` destination select from UI. Default `type=expense`. Keep: amount (big, `inputmode="numeric"`, Rp prefix, `zod .int().positive().max(999_999_999)` server rule unchanged), grouped `WalletSelect`, 8 category chips from `constants.ts`, `date` default today WIB (`todayISO()`), description, inline `fieldErrors`. Keep `ModalShell` sheet-on-mobile behavior, focus-trap, ESC. Server `TxSchema` transfer branch stays (dormant) — do not touch `validation.ts`.
6. Wallets saldo-awal UX (no schema change). On create form add optional `Saldo awal (Rp)` numeric input; when > 0, after `createWallet` call existing `adjustWalletBalance` in the same action to post the `Penyesuaian saldo` transaction (income if positive). Keep: duplicate-name guard (`duplicate`), delete guard (`has-transactions`), kind `digital|cash` presets + seeds (`seed-cash` Tunai, `seed-digital` Dompet Digital). Never add a balance column.
7. Verify + clean. Run `npm run check && npm run test`. Manual pass at 360x800 + 390x844, light + dark, reduced-motion on: (a) dashboard order fits without horizontal scroll, (b) FAB opens form, Lainnya sheet lists only Copilot/Pengaturan, (c) create wallet with saldo awal -> balance correct, (d) add income/expense -> totals + history update after `invalidateAll()`, (e) no console errors, focus stays trapped in modals. Run `graphify update .`.

## Acceptance Criteria

- [ ] Dashboard shows ONLY: Total, 2 Catat actions, Digital/Tunai, Dompet, Transaksi Terakhir. No Wawasan, no Tren, no hutang card, no Transfer/Dompet/Analitik quick tiles, no LayerChart on `/`.
- [ ] Nav has 5 links total (Beranda, Transaksi, Dompet, Copilot, Pengaturan). No Hutang/Analitik link anywhere. No duplicated Analitik in sheet.
- [ ] Transactions page has no checkboxes, no bulk bar, no day-bars, no Pemasukan/Pengeluaran filter chips. Month + search + wallet deep-link + paging still work.
- [ ] TransactionForm offers only Pemasukan/Pengeluaran (transfer gone from UI), defaults to Pengeluaran, amount/category/wallet/date/description all work on a 360px sheet.
- [ ] New wallet with Saldo awal X shows balance X with zero manual transactions; Atur Saldo still posts one `Penyesuaian saldo` row; balances still computed (no balance column added).
- [ ] Copilot + Settings + login/logout behave exactly as before (untouched).
- [ ] `/hutang` and `/analytics` URLs still render (dormant) but are unreachable from any button/link/card in the app.
- [ ] `npm run check && npm run test` green. No new dependency, no migration file, no `schema.sql` edit.

## Verification / Tests

- `npm run check` (svelte-kit sync + svelte-check, TS strict, includes `.svelte`).
- `npm run test` (vitest run; fake-Db suites; no live D1).
- Manual mobile checklist (see Step 7). Screenshot 360px dashboard top + bottom + open form if possible.
- `graphify update .` after code changes (per repo convention).
- If `TxSchema`/SQL had to change for any reason (should not), extend fake-Db assertions FIRST per `AGENTS.md`, then change `db.ts`.

## Git

- Plan file commit: on `main` (planner already committed `plan/mvp-simplify-mobile.md`).
- Implementation branch: `feature/mvp-simplify-mobile` (builder creates from current `main`).
- Single sequential plan: builder may merge inline after green (per `builder.md` single-plan rule); no `/integrate` queue needed since there are no sibling plans.

## Integration Notes

- No sibling plans. No merge order. No shared migration/lockfile/config with another stream.
- Overlap risk is internal (dashboard + nav + form share `open-transaction-form` event + wallet types) — that is why this is ONE plan, not three. Do not split by file.
- Dormant code left behind (`hutang/`, `analytics/`, `bulkDelete` action, transfer branch, trend/debt queries in `db.ts`) is intentional. A follow-up cleanup plan (delete routes + dead queries + LayerChart dep) can run after the user confirms the MVP hierarchy feels right. Do not sneak deletions into this plan.
- Stitch pass (when the user supplies the API key): new session, same branch or a `feature/mvp-stitch-map` branch off this one. Map Stitch HTML -> existing Svelte 5 runes + Tailwind tokens + `app.css` utilities. Constraints for that pass: no new CSS framework, no gradient, keep `ModalShell`, keep 44px targets, keep Indonesian copy, keep server actions untouched. If Stitch output conflicts with acceptance criteria above, this plan wins.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 — Trim dashboard load | builder | A | Inline: trivial, needs current context, touches server load only |
| 2 — Simplify Navigation | designer | A | Isolated UI file (`Navigation.svelte`), no shared state with Step 1 (different files); designer owns nav/a11y/safe-area |
| 3 — Dashboard hierarchy rebuild | designer | — | Depends on Step 1 data shape; mobile-first UI specialization; sequential to avoid same-file clash with Step 1 |
| 4 — Transactions + TransactionForm + Wallets saldo-awal | builder | — | Form actions + validation edge cases + adjust-transaction logic; sequential (shares form + wallet types with Step 3) |
| 5 — Rules + spec audit | reviewer | B | Read-only: diff vs `AGENTS.md` non-negotiables + this plan's acceptance criteria; parallel-safe with Step 6 |
| 6 — Check + tests + manual mobile checklist | tester | B | Isolated run (`check`, `test`, 360px pass), compact report; parallel with reviewer, no shared mutable state |

Dependencies: 3 needs 1 (data shape). 4 needs 3 (form preset wiring + wallet list contract). 5 + 6 need 1–4 green (Batch B in one message). Batch A (Steps 1 + 2) ships in one message; everything else sequential. If designer is unavailable, builder absorbs Steps 2–3 inline (same branch, same acceptance criteria).
