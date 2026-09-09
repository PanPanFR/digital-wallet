# Implementation Plan: Wallet Fixes (Duplicate Guard + Edit Balance)

## Objective

Two wallet fixes: (1) prevent duplicate wallet names — adding "GoPay" when a "GoPay" wallet already exists must fail; (2) allow editing a wallet's balance directly ("Atur Saldo") without breaking the computed-balance model.

## Scope

- Duplicate guard on wallet create **and** rename: name compared case-insensitively after trim; a wallet whose name matches an existing wallet (any kind) is rejected with a friendly error. Applied at the DB helper level so both actions share it.
- "Atur Saldo" per wallet: modal to enter a new balance; the app computes the diff and creates a single adjustment transaction (type `income`/`expense` by sign, description "Penyesuaian saldo", category "Lainnya", date today). Balance stays computed from transactions — **no `balance` column, no migration**.
- No change to `wallets` schema, no change to transaction form or any other page.

## Context

- Stack: SvelteKit 2 + Svelte 5 (runes), Cloudflare Workers + D1, Tailwind 4, zod, vitest.
- SvelteKit 2 gotcha (project memory): use `ServerLoad` + `RequestEvent` from `@sveltejs/kit`; `PageServerLoad` does not exist.
- `src/lib/server/db.ts:76-83` `createWallet` inserts without any duplicate check. `updateWallet` (`db.ts:86-108`) renames without checking collisions against other rows.
- Balance is always computed: `BALANCE_SQL` (`db.ts:133-137`) sums income/expense/transfer per wallet; `getWalletBalances` (`db.ts:140`) returns `WalletWithBalance[]` with `balance`.
- `createTransaction(db, tx: TxInput)` (`db.ts:224-237`) exists and handles `type`, `amount` (positive), `description`, `category`, `wallet_id`, `date`.
- `src/routes/wallets/+page.server.ts`: actions `create`, `update`, `delete`; `load` returns `{ wallets: WalletWithBalance[] }`. Failures use `fail(400, { errors: fieldErrors(...) })` for form errors and `fail(400, { error })` for single errors.
- `src/routes/wallets/+page.svelte`: `walletRow` snippet shows name + balance with Pencil (edit name/kind) and Trash2 buttons; `ConfirmModal` used for delete. Follow existing modal + `use:enhance` patterns.
- `TxInput` type (`db.ts:34`): `type: 'income' | 'expense' | 'transfer'`.

## Dependencies

None. Branches from current `main` (5ac576b). No file overlap with sibling plans (`plan/ai-provider-settings.md`, `plan/bulk-select.md`, `plan/ui-cleanups.md`).

## Files / Areas Likely Affected

- `src/lib/server/db.ts`: duplicate-name helpers + guard in `createWallet`/`updateWallet`; new `adjustWalletBalance(db, walletId, newBalance)`; new `deleteTransactions` is NOT here (that is bulk-select's plan — do not add).
- `src/routes/wallets/+page.server.ts`: map `'duplicate'` → form error; new `adjust` action.
- `src/routes/wallets/+page.svelte`: "Atur Saldo" button per row + modal + hidden form for `?/adjust`.
- `src/lib/server/db.test.ts`: duplicate guard + `adjustWalletBalance` tests.
- `src/lib/server/validation.ts`: no change (adjustment uses existing `createTransaction` path; balance input validated in the action with a small zod schema or inline check).

## Implementation Steps

1. **db.ts — duplicate guard.** Add `walletNameExists(db, name, excludeId?)`: `SELECT COUNT(*) AS n FROM wallets WHERE lower(trim(name)) = lower(trim(?)) AND id != ?` (omit `AND id != ?` when no excludeId). Change `createWallet` to check first and return `'duplicate' | string(id)`. Change `updateWallet` to check with `excludeId` and return `'duplicate' | boolean`. Keep return types narrow; callers adapt.
2. **db.ts — `adjustWalletBalance(db, walletId, newBalance)`.** Read current balance via `getWalletBalances` (find wallet, `'not-found'` if missing). `diff = round(newBalance) - balance`. If `diff === 0` return `'no-change'`. Else `createTransaction({ wallet_id: walletId, description: 'Penyesuaian saldo', amount: abs(diff), category: 'Lainnya', type: diff > 0 ? 'income' : 'expense', date: today ISO })` and return `'adjusted'`. Guard: newBalance must be finite ≥ 0 (validation in the action too).
3. **`src/routes/wallets/+page.server.ts`.** `create`: if `createWallet` returns `'duplicate'` → `fail(400, { errors: { name: 'Dompet dengan nama itu sudah ada' } })`. `update`: if `'duplicate'` → same error under `editErrors.name`. New action `adjust`: parse `id` + `newBalance` (zod: `z.coerce.number().int().min(0).max(999_999_999_999)`); call `adjustWalletBalance`; map `'not-found'` → 404 error, `'no-change'` → success (nothing to do). Return `{ success: true }`.
4. **`src/routes/wallets/+page.svelte`.** Add "Atur Saldo" button (Wallet icon or text) in each wallet row's action cluster (next to Pencil/Trash). New state: `adjustTarget: WalletWithBalance | null`, `adjustValue`, `adjustErrors`, `adjustSubmitting`. Modal (reuse styling of ConfirmModal but with a form): shows wallet name, current balance, number input prefilled with current balance, save/cancel. Hidden form `?/adjust` with `use:enhance`, `notify('success', 'Saldo diperbarui')` on success.
5. **Tests (db.test.ts).** Existing suite uses a mocked D1 (vitest). Add: `createWallet` duplicate returns `'duplicate'` for case/whitespace variants ("GoPay" vs " gopay "); `updateWallet` allows same-name self-update but rejects colliding rename; `adjustWalletBalance` creates expense tx when lowering balance, income when raising, no-change at 0 diff, not-found for missing wallet. Verify the created transaction values (description "Penyesuaian saldo", type, amount = abs diff).

## Acceptance Criteria

- Creating "GoPay" twice (any casing/whitespace) → second attempt shows "Dompet dengan nama itu sudah ada" and no row is inserted.
- Renaming a wallet to an existing name → error; renaming it to its own name (or another free name) works.
- "Atur Saldo" sets the displayed balance immediately after reload; the adjustment appears in the transactions list as "Penyesuaian saldo" with correct sign; other wallets' balances unchanged.
- Entering the same balance as current → no-op success, no transaction row created.
- `npm test`, `npm run check`, `npm run build` all green.

## Verification / Tests

- `npm test` — db.test.ts new cases.
- `npm run check` — svelte-check 0 errors.
- `npm run build` — production build ok.
- Manual smoke (dev login): wallets page → add GoPay, add GoPay again (must error) → Atur Saldo on a wallet, reload, check transactions list for "Penyesuaian saldo".

## Git

- Branch: `feature/wallet-fixes`
- Commit style: conventional. Suggested: `fix(wallets): reject duplicate names`, `feat(wallets): edit wallet balance`.

## Integration Notes

- No file overlap with sibling plans (ai-provider-settings, bulk-select, ui-cleanups) — safe to merge in any order. Only `src/lib/server/db.ts` is shared with `plan/bulk-select.md` (which adds `deleteTransactions`/`deleteDebts`); different functions, git will auto-merge if both touch the file — keep changes in separate regions and re-run tests after merge.
- Do NOT add `deleteTransactions` here — that belongs to the bulk-select plan.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 (db.ts dup guard + adjustWalletBalance) | builder | A | Core DB logic, needs full db.ts context |
| 2 (wallets server actions) | builder | B | Depends on step 1 return types |
| 3 (wallets UI: Atur Saldo modal) | designer | B | UI-only, form contract fixed by step 2 |
| 4 (db.test.ts new cases) | tester | B | Spec from step 1–2; independent of UI |
| 5 (verify: check/build/tests) | builder | inline | After B lands |

Batch B = steps 2,3,4 in one message (mutating work is builder-inline territory; designer does UI, tester does tests). Reviewer optional: logic is small, builder self-check suffices.
