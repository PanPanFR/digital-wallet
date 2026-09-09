# Implementation Plan: Bulk Select (Checkboxes + Select All + Bulk Delete)

## Objective

Add row checkboxes with a select-all control to the list pages — Transactions and Hutang — so multiple rows can be selected and deleted in one action.

## Scope

- Transactions page: checkbox per row + header select-all (indeterminate when partial), "Hapus (n)" button appears when ≥1 selected, bulk-delete action deletes selected rows.
- Hutang page: same pattern; bulk-delete refuses if any selected debt has payments (existing per-row guard semantics).
- Selection is client-side state over the currently loaded rows only. Transactions list is paginated at 50/page (`transactions/+page.server.ts:24,35`); bulk delete applies to the rows currently visible on the page. Document this in the UI ("hapus yang terpilih di halaman ini").
- No schema change. No change to single-row delete, edit, or other actions.

## Context

- Stack: SvelteKit 2 + Svelte 5 (runes), Cloudflare Workers + D1, Tailwind 4, zod, vitest.
- SvelteKit 2 gotcha (project memory): use `ServerLoad` + `RequestEvent`; `PageServerLoad` does not exist.
- Transactions list markup: `transactions/+page.svelte:190-240` — `<li class="flex items-center gap-3 px-4 py-3">` per row with edit/delete buttons. Single delete via hidden form `?/delete` + `ConfirmModal` (`transactions/+page.svelte:256-269`). Actions in `transactions/+page.server.ts` (`create`, `update`, `delete`); `delete` reads a single `id`.
- Hutang list markup: `hutang/+page.svelte:190+` — rows with `d.id`; single delete action `?/delete` in `hutang/+page.server.ts:52-57` with `'has-payments'` guard via `deleteDebt` (`db.ts`).
- DB helpers to add: `deleteTransactions(db, ids)` (batch `DELETE ... WHERE id IN (...)`) and `deleteDebts(db, ids)` returning `{ deleted: number, rejected: number }` when any id has payments (query `debt_payments` first).
- Svelte 5 runes pattern: `$state` for the selection Set, `$derived` for count/allSelected/indeterminate. Use `Set<string>`; clear on reload (component re-creates anyway).
- Note: transactions page applies a client-side kind filter on `load` (`transactions/+page.server.ts:36`) — selection uses the displayed rows, matching user expectation.

## Dependencies

None. Branches from current `main` (5ac576b). Shares `src/lib/server/db.ts` with `plan/wallet-fixes.md` (different functions — keep separate regions).

## Files / Areas Likely Affected

- `src/lib/server/db.ts`: `deleteTransactions(db, ids)`, `deleteDebts(db, ids)`.
- `src/routes/transactions/+page.server.ts`: new `bulk-delete` action (parse comma-separated `ids`, validate non-empty, call `deleteTransactions`).
- `src/routes/transactions/+page.svelte`: checkbox column + select-all header + "Hapus (n)" button + hidden bulk form.
- `src/routes/hutang/+page.server.ts`: new `bulk-delete` action (call `deleteDebts`, map rejected count to error message when > 0).
- `src/routes/hutang/+page.svelte`: same checkbox pattern + bulk button.
- `src/lib/server/db.test.ts`: `deleteTransactions`, `deleteDebts` guard tests.

## Implementation Steps

1. **db.ts — `deleteTransactions(db, ids: string[])`.** If empty return 0. Build `DELETE FROM transactions WHERE id IN (?,?,…)` with `db.batch` if needed or a single statement with placeholders (ids are app-generated UUIDs; D1 supports prepared statements with multiple binds — single statement with `ids.map(() => '?').join(',')`). Return `changes`.
2. **db.ts — `deleteDebts(db, ids: string[])`.** If empty return `{ deleted: 0, rejected: 0 }`. Query `SELECT debt_id FROM debt_payments WHERE debt_id IN (…)` → set of ids with payments. Delete debts whose id is NOT in that set (single batched statement). Return `{ deleted, rejected }` where `rejected` = ids blocked by payments. (No cascade needed: `debt_payments.debt_id` has `ON DELETE CASCADE`, but we block those anyway to match existing UX.)
3. **`transactions/+page.server.ts`** — `bulk-delete`: read `ids` from formData (comma-separated string or repeated `ids` fields — prefer comma-separated single field `ids`), split, trim, filter non-empty, dedupe. If empty → `fail(400, { error: 'Pilih transaksi dulu' })`. Call `deleteTransactions`. Return `{ success: true, count }`.
4. **`transactions/+page.svelte`** — script: `let selected = $state(new Set<string>())`; derived `selectedCount`, `allSelected` (count === rows length), `indeterminate` (count > 0 && !allSelected). Header row above the `<ul>` (or first row): select-all checkbox with `bind:checked={allSelected}` + `onchange` handler toggling the set (handle indeterminate via a ref + `:indeterminate` binding — Svelte 5 supports `bind:indeterminate` on checkboxes? No — use `onmount`/effect to set `el.indeterminate`, or a small action. Simplest: keep a `selectAllEl` state and set `.indeterminate` in an `$effect`). Each row gets a checkbox `bind:group` won't work with Sets; use per-row `onchange` toggling `selected`. "Hapus (n)" button visible when `selectedCount > 0`, opens ConfirmModal (reuse existing) → submits hidden form `?/bulk-delete` with `<input name="ids" value={[...selected].join(',')}>`. On success: clear selection + `notify('success', 'Transaksi dihapus')`. Add caption "Menghapus yang terpilih di halaman ini saja."
5. **`hutang/+page.server.ts`** — `bulk-delete`: same parsing; call `deleteDebts`; if `rejected > 0` → `fail(400, { error: `${rejected} catatan punya pembayaran dan tidak dihapus` })` (still return success signal for the deleted ones? Simpler: fail with message listing blocked count; UI shows error via notify. Decide: return `{ success: true, deleted, rejected }` and let UI notify accordingly — cleaner than partial-fail.) UI: notify success with counts.
6. **`hutang/+page.svelte`** — same checkbox pattern as transactions. Rows keyed by `d.id`; disabled checkbox for rows with `d.remaining === 0`? No — keep all selectable, guard is server-side. Keep it simple and consistent.
7. **Tests (db.test.ts)** — `deleteTransactions` deletes only given ids; empty input no-op. `deleteDebts`: deletes clean debts, rejects debts with payments (returns rejected count), leaves them intact.

## Acceptance Criteria

- Transactions: check 2+ rows → "Hapus (n)" appears → confirm → rows gone after reload; select-all toggles all visible rows; indeterminate state shows when partially selected.
- Hutang: same behavior; bulk delete with a debt that has payments → those are skipped with a clear message, the rest are deleted.
- Empty selection → button hidden (or disabled); empty ids → friendly error, no DB call.
- Per-row edit/delete still works unchanged.
- `npm test`, `npm run check`, `npm run build` all green.

## Verification / Tests

- `npm test` — db.test.ts new cases.
- `npm run check` — svelte-check 0 errors.
- `npm run build` — build ok.
- Manual smoke: add 3 transactions + 1 hutang with a payment; select all on transactions → delete → verify; select the paid hutang + one clean → delete → verify paid one survives with message.

## Git

- Branch: `feature/bulk-select`
- Commit style: conventional. Suggested: `feat(transactions): bulk delete with select-all`, `feat(hutang): bulk delete with select-all`.

## Integration Notes

- No file overlap with `plan/ai-provider-settings.md`, `plan/ui-cleanups.md`. `src/lib/server/db.ts` shared with `plan/wallet-fixes.md` — different function regions; git auto-merges; re-run tests after merge. `transactions/+page.server.ts` and `hutang/*` are exclusive to this plan.
- Merge order: any. After integration, verify both pages' checkboxes + svelte-check.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 (db.ts deleteTransactions/deleteDebts) | builder | A | Core DB logic |
| 2 (transactions server action) | builder | A | Depends on step 1 |
| 3 (transactions UI checkboxes) | designer | B | UI pattern work |
| 4 (hutang server action) | builder | B | Independent of UI |
| 5 (hutang UI checkboxes) | designer | B | Same pattern as step 3, but different page — parallel ok (no shared files) |
| 6 (db.test.ts) | tester | B | Spec from step 1 |
| 7 (verify: check/build/tests) | builder | inline | After B lands |

Batch B = steps 3,4,5,6 in one message. Steps 3 & 5 both designer on different files — fine. Dependencies: A → B. Reviewer optional: thin actions, self-check sufficient.
