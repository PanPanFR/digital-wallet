# Implementation Plan: React Core Features

## Objective

Rebuild the four daily-use pages — dashboard, transactions, wallets (dompet), debts (hutang) — as React components on the plan-1 API contract, with Indonesian copy and Catppuccin visuals preserved.

## Scope

In: `Dashboard`, `Transactions`, `Wallets`, `Debts` pages; shared components `TransactionForm` (create/edit modal incl. transfer), `ConfirmModal`, `ModalShell` (`center|sheet`), `WalletSelect`, `Toast`, `Skeleton`; `useToast` hook, `formatIDR`/date helpers reuse; mutations via TanStack `useMutation` + query invalidation (replaces form actions + `invalidateAll()`); bulk-select delete; adjust-saldo; debt pay + reduce-balance flows; quick-add FAB event (`open-transaction-form`).
Out: analytics, copilot, settings, backup UI, theme toggle, navigation shell (plan 3). No API changes — contract gaps go back to plan-1 branch, not hacked around here.

## Context

Stack/conventions from plan 1: Vite+React 19, React Router, TanStack Query 5, Tailwind v4, `web/src/api/client.ts` (`credentials: include`, 401 → `/login`). Design tokens from `src/app.css` (Catppuccin Latte/Mocha roles: peach `#fe640b` primary, blue transfer, green income, red expense; `.card/.btn/.input/.chip/.tile` utilities ported to `web/src/index.css`; no gradients; 44px inputs; `Rp` prefix; tabular `tnum` numerals). Visual spec = old `src/routes/**/+page.svelte` (still in repo until plan 3). Copy stays Indonesian; code English. Data rules: amounts positive ints ≤999.999.999, sign implied by type; transfer needs distinct destination; empty date defaults to today WIB.

## Dependencies

Plan 1 merged to `main` (API contract + `shared/types.ts` + `api/client.ts` + Login). No new dependencies.

## Files / Areas Likely Affected

- Create: `web/src/pages/Dashboard.tsx|Transactions.tsx|Wallets.tsx|Debts.tsx`, `web/src/components/TransactionForm.tsx|ConfirmModal.tsx|ModalShell.tsx|WalletSelect.tsx|Toast.tsx|Skeleton.tsx`, `web/src/hooks/useToast.tsx`, `web/src/lib/queryKeys.ts`.
- Endpoints used (subset of plan-1 contract, restated so this plan stands alone): `GET /api/dashboard?month`, `GET /api/transactions?…`, `POST/PATCH/DELETE /api/transactions…`, `POST /api/transactions/bulk-delete`, `GET/POST/PATCH/DELETE /api/wallets…`, `POST /api/wallets/:id/adjust`, `GET/POST /api/debts…`, `POST /api/debts/:id/payments`, `DELETE /api/debts/:id`, `POST /api/debts/bulk-delete`.
- Edit: `web/src/app.tsx` (routes), `web/src/index.css` (port component utilities only).

## Implementation Steps

1. Port CSS utilities + `formatIDR`/date helpers; `queryKeys.ts`; route shells with `Skeleton` loading states.
2. `ModalShell` + `ConfirmModal` + `Toast`/`useToast` + `WalletSelect` (grouped by kind).
3. `TransactionForm` (income/expense/transfer modes, wallet selects, presets, zod-client pre-check, server errors shown per-field).
4. Dashboard (totals, kind subtotals, 6-month trend as plain list/bars placeholder — charts in plan 3 — recent 10, quick-add, debt summary).
5. Transactions (filters month/wallet/search/category, limit 50 + load-more, bulk-select + delete, edit modal).
6. Wallets (grouped list + balances, create/rename/delete guards incl. `has-transactions` message, Atur Saldo).
7. Debts (owe/owed tabs, remaining totals, create incl. reduce-balance, pay dialog with overpay guard, deletes keep tx rows — copy must say so).

## Acceptance Criteria

- Feature parity with old pages for all CRUD + transfer + adjust + pay flows, incl. server guard messages (`duplicate`, `has-transactions`, `overpay`) shown in Indonesian.
- No hand-rolled `fetch` outside `api/client.ts`; every mutation invalidates its queries (no stale balances after any write).
- Mobile: bottom safe-area padding, modals usable at 360px; desktop ≥1024px layouts match old structure.
- `npm run check && npm run test` green (no new server tests; component logic covered by existing suite + manual checklist).

## Verification / Tests

- `npm run check && npm run test && npm run build`.
- Manual pass against old pages side-by-side (old `src/routes` still present): create/edit/delete each entity, transfer between wallets, adjust saldo both directions, debt full lifecycle with reduce-balance on/off, bulk deletes, filter combos. Confirm paired debt transactions appear in Transactions list.

## Git (branch: feature/react-core-features)

Branch off `main` AFTER plan 1 merged. Merges SECOND, before plan 3.

## Integration Notes

Depends on plan 1 (API contract); merges before plan 3 (which reuses `ModalShell`, `Toast`, `queryKeys`, `index.css`). File overlap with plan 3: `web/src/app.tsx` (additive routes — plan 3 appends), `web/src/components/` (disjoint new files), `web/src/index.css` (plan 3 appends theme/nav styles — merge plan 2 first, plan 3 rebases). Contract change needed → fix in plan-1 branch first, never fork the API here.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|---|---|---|---|
| 1 css utils + helpers + query keys | builder | — | Inline: foundation for all steps below |
| 2 modal/toast/select primitives | designer | B | Self-contained UI, no shared state with step 3 |
| 3 TransactionForm spec vs old Svelte form | reviewer | B | Read-only parity audit, parallel to build |
| 3 TransactionForm build | designer | — | Sequential: needs step 2 primitives |
| 4 dashboard | designer | C | Page-independent (own route + queries) |
| 5 transactions | designer | C | Page-independent, parallel to 4/6/7 |
| 6 wallets | designer | C | Page-independent, parallel to 4/5/7 |
| 7 debts | designer | C | Page-independent, parallel to 4/5/6 |
| Final parity pass (all pages vs old) | reviewer | — | Read-only review before merge |
