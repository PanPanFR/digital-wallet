# Implementation Plan: Debt Deletion With Payments (Cascade)

> **For agentic workers:** execute task-by-task, top to bottom, checking off each step. Verify after every task before moving on.

**Goal:** Deleting a debt must work even when it has recorded payments — atomically remove the debt plus its `debt_payments` rows, while leaving the wallet `transactions` those payments produced intact.

**Architecture:** `deleteDebt` / `deleteDebts` change from "reject when payments exist" to one atomic `db.batch` per call: delete `debt_payments` first, then `debts`. No `transactions` row is touched — each payment already wrote an independent transaction row and nothing links it back to the debt, so it survives as the historical record of money that moved.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes · Cloudflare Workers + D1 · TypeScript strict · Vitest (node env, fake-DB unit tests) · Tailwind 4.

**Spec:** No separate spec exists; this plan is the source of truth.

## Global Constraints

- All SQL lives in `src/lib/server/db.ts`; every exported function takes `D1Database` first.
- Balances are computed, never stored — do not add a column.
- Mutations go through SvelteKit form actions + `enhance`/`invalidateAll`; no hand-rolled `fetch`.
- Server-side zod (`src/lib/server/validation.ts`) is the only validation source — untouched here.
- UI copy Indonesian, code/docs English.
- Tests are server-side fake-DB unit tests; extend the fake-DB assertions **before** touching the SQL.
- Verification command: `npm run check && npm run test`.
- No schema change and no migration: `schema.sql:45` already has `debt_payments.debt_id REFERENCES debts(id) ON DELETE CASCADE`. Do **not** run anything against `--remote` D1.

## Context (verified against code)

| Fact | Location |
|---|---|
| `deleteDebt` refuses with `'has-payments'` | `src/lib/server/db.ts:643-655` |
| `deleteDebts` rejects blocked ids, returns `{deleted, rejected}` | `src/lib/server/db.ts:657-678` |
| Route maps `'has-payments'` → fail; bulk passes `{deleted,rejected}` | `src/routes/hutang/+page.server.ts:53-71` |
| Bulk UI handler reads `res.rejected` | `src/routes/hutang/+page.svelte:180-185` |
| Single + bulk `ConfirmModal`s | `src/routes/hutang/+page.svelte:618-640` |
| `debt_payments` FK has `ON DELETE CASCADE` | `schema.sql:45` |
| `batchDb()` fake records batched stmts, returns `{meta:{}}` | `src/lib/server/db.test.ts:252-274` |
| Old delete tests | `src/lib/server/db.test.ts:381-415` and `:500-518` |

## Dependencies

- None upstream.
- Only consumers of the changed signatures are `src/routes/hutang/+page.server.ts` and `src/lib/server/db.test.ts` (grep-verified) — both updated here.
- Sibling plan `mobile-bottom-nav-sheet.md` shares no files.

## Files / Areas Likely Affected

- Modify (tests first): `src/lib/server/db.test.ts`
- Modify (implementation): `src/lib/server/db.ts`
- Modify (route + UI): `src/routes/hutang/+page.server.ts`, `src/routes/hutang/+page.svelte`
- Modify (docs): `docs/data-model.md`
- Create: none

## Interfaces (frozen before coding)

```ts
deleteDebt(db: D1Database, id: string): Promise<'deleted' | 'not-found'>
deleteDebts(db: D1Database, ids: string[]): Promise<{ deleted: number }>
```

## Implementation Steps

### Task 1: Rewrite fake-DB tests (red first)

Files: `src/lib/server/db.test.ts`

- [ ] **Step 1.1** Extend `batchDb` to return a configurable change count so `deleteDebt`'s not-found path becomes testable:

```ts
/** Fake D1 that records batched statements (sql + binds) for money-path assertions. */
function batchDb(rows: unknown[] = [], changes = 1) {
	const batched: { sql: string; binds: unknown[] }[] = [];
	const db = {
		prepare: (sql: string) => {
			const entry: { sql: string; binds: unknown[] } = { sql, binds: [] };
			const result = {
				all: async () => ({ results: rows }),
				first: async () => rows[0] ?? null,
				run: async () => ({ meta: { changes: 1 } })
			};
			return {
				bind: (...b: unknown[]) => ((entry.binds = b), { ...result, ...entry }),
				...result
			};
		},
		batch: async (stmts: { sql: string; binds: unknown[] }[]) => {
			batched.push(...stmts);
			return stmts.map(() => ({ meta: { changes } }));
		}
	};
	return { db: db as unknown as D1Database, batched };
}
```

- [ ] **Step 1.2** Replace the whole `describe('deleteDebt')` block (currently `db.test.ts:381-415`):

```ts
describe('deleteDebt', () => {
	it('cascades payments then debt in one batch and returns deleted', async () => {
		const { db, batched } = batchDb([], 1);
		expect(await deleteDebt(db, 'x')).toBe('deleted');
		expect(batched.map((b) => b.sql)).toEqual([
			'DELETE FROM debt_payments WHERE debt_id = ?',
			'DELETE FROM debts WHERE id = ?'
		]);
		expect(batched[0].binds).toEqual(['x']);
		expect(batched[1].binds).toEqual(['x']);
	});
	it('returns not-found when the debt delete changes nothing', async () => {
		const { db } = batchDb([], 0);
		expect(await deleteDebt(db, 'x')).toBe('not-found');
	});
});
```

- [ ] **Step 1.3** Replace the whole `describe('deleteDebts')` block (currently `db.test.ts:500-518`):

```ts
describe('deleteDebts', () => {
	it('cascades payments and debts in one batch and returns the deleted count', async () => {
		const { db, batched } = batchDb([], 2);
		expect(await deleteDebts(db, ['d1', 'd2'])).toEqual({ deleted: 2 });
		expect(batched[0].sql).toBe('DELETE FROM debt_payments WHERE debt_id IN (?,?)');
		expect(batched[0].binds).toEqual(['d1', 'd2']);
		expect(batched[1].sql).toBe('DELETE FROM debts WHERE id IN (?,?)');
		expect(batched[1].binds).toEqual(['d1', 'd2']);
	});
	it('empty ids is a no-op', async () => {
		const { db, batched } = batchDb();
		expect(await deleteDebts(db, [])).toEqual({ deleted: 0 });
		expect(batched).toHaveLength(0);
	});
});
```

- [ ] **Step 1.4** Run `npm run test` → expect FAIL (`deleteDebt` still returns `'has-payments'`, `deleteDebts` still returns `rejected`). Keep the output as evidence.

### Task 2: Implement in `db.ts`

Files: `src/lib/server/db.ts`

- [ ] **Step 2.1** Replace `deleteDebt` (currently lines 643-655):

```ts
/**
 * Delete a debt and its payment rows in one atomic batch.
 *
 * The wallet `transactions` written by those payments are intentionally kept:
 * they record real money movement, and nothing links them back to the debt.
 * The explicit child delete does not rely on the schema's ON DELETE CASCADE.
 */
export async function deleteDebt(
	db: D1Database,
	id: string
): Promise<'deleted' | 'not-found'> {
	const [, debtRes] = await db.batch([
		db.prepare('DELETE FROM debt_payments WHERE debt_id = ?').bind(id),
		db.prepare('DELETE FROM debts WHERE id = ?').bind(id)
	]);
	return (debtRes.meta?.changes ?? 0) > 0 ? 'deleted' : 'not-found';
}
```

- [ ] **Step 2.2** Replace `deleteDebts` (currently lines 657-678):

```ts
/**
 * Delete many debts and their payment rows in one atomic batch.
 * Same transaction-preservation rules as `deleteDebt`.
 */
export async function deleteDebts(
	db: D1Database,
	ids: string[]
): Promise<{ deleted: number }> {
	if (ids.length === 0) return { deleted: 0 };
	const placeholders = ids.map(() => '?').join(',');
	const [, debtRes] = await db.batch([
		db.prepare(`DELETE FROM debt_payments WHERE debt_id IN (${placeholders})`).bind(...ids),
		db.prepare(`DELETE FROM debts WHERE id IN (${placeholders})`).bind(...ids)
	]);
	return { deleted: debtRes.meta?.changes ?? 0 };
}
```

- [ ] **Step 2.3** Run `npm run test` → all PASS. Run `npm run check` → no errors from `db.ts`.

### Task 3: Route action + UI copy

Files: `src/routes/hutang/+page.server.ts`, `src/routes/hutang/+page.svelte`

- [ ] **Step 3.1** `src/routes/hutang/+page.server.ts` — replace the `delete` action (lines 53-59):

```ts
	delete: async ({ request, platform }: RequestEvent) => {
		const id = String((await request.formData()).get('id') ?? '');
		const res = await deleteDebt(platform!.env.DB, id);
		if (res === 'not-found') return fail(400, { error: 'Utang tidak ditemukan' });
		return { success: true };
	},
```

- [ ] **Step 3.2** Same file — replace the tail of `bulkDelete` (lines 69-70):

```ts
		const { deleted } = await deleteDebts(platform!.env.DB, ids);
		return { success: true, deleted };
```

- [ ] **Step 3.3** `src/routes/hutang/+page.svelte` — replace lines 180-185 inside `handleBulkDelete` (drops the `res.rejected` branch):

```ts
			if (result.type === 'success') {
				const res = result.data as { deleted?: number };
				selected = new Set();
				notify('success', `${res.deleted ?? 0} catatan hutang dihapus`);
			}
```

- [ ] **Step 3.4** Same file — single-delete `ConfirmModal` `message` (lines 621-623): warn only when a payment history exists:

```svelte
	message={deleteTarget
		? deleteTarget.paid > 0
			? `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(deleteTarget.amount)})? Catatan ini punya pembayaran tercatat ${formatIDR(deleteTarget.paid)}. Riwayat hutang dihapus, tapi transaksi dompet yang sudah tercatat tetap tersimpan.`
			: `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(deleteTarget.amount)})? Tindakan ini tidak bisa dibatalkan.`
		: ''}
```

- [ ] **Step 3.5** Same file — bulk `ConfirmModal` `message` (line 636):

```svelte
	message={`Hapus ${selectedCount} catatan hutang terpilih? Riwayat hutang dihapus, tapi transaksi dompet yang sudah tercatat tetap tersimpan.`}
```

- [ ] **Step 3.6** Run `npm run check` → 0 errors (this confirms no dangling `rejected` reference remains).

### Task 4: Docs

Files: `docs/data-model.md`

- [ ] **Step 4.1** `docs/data-model.md:136` — replace the two code fragments in the `Code:` paragraph:
  - `deleteDebt` (`'has-payments'` guard) → `deleteDebt` (atomic batch: child `debt_payments` then `debts`)
  - `deleteDebts` (bulk: debts with payments are rejected, intact) → `deleteDebts` (same, bulk; returns `{ deleted }`)
- [ ] **Step 4.2** `docs/data-model.md` — after the index line ending `debt_payments(debt_id)`, `debts(direction)`. (line 134), add:

```
> Deleting a debt removes its `debt_payments` rows (explicit batch delete, not reliant on `ON DELETE CASCADE`) but leaves the paired `transactions` rows in place: the money already moved, only the debt record disappears.
```

## Acceptance Criteria

- Deleting a debt that has payments succeeds; its `debt_payments` rows are gone; the matching `transactions` remain.
- Bulk delete removes every selected debt including those with payments, and returns a count.
- Deleting a non-existent id yields `'not-found'` → the route returns the "Utang tidak ditemukan" failure.
- No reference to `'has-payments'` or `rejected` remains in `src/`.
- `npm run check` and `npm run test` both green.

## Verification / Tests

- `npm run test` — new `deleteDebt` / `deleteDebts` cases green (they are red before Task 2).
- `npm run check` — TypeScript strict + Svelte, 0 errors.
- Manual: on `/hutang`, create a debt with "reduce balance" (that path writes a payment row + a wallet transaction), then delete it → debt row gone, warning shown in the dialog, paired transaction still visible under `/transactions`, wallet balance unchanged. Repeat via bulk select.

## Git

- Branch: `feature/debt-delete-with-payments`
- Suggested commits:
  1. `test: drop has-payments guard expectations for debt delete`
  2. `feat(db): cascade debt deletion, keep wallet transactions`
  3. `feat(hutang): cascade delete copy and count toast`
  4. `docs(data-model): document debt cascade delete`

## Deployment

No schema change, no migration, no D1 `--remote` step. Ships with a normal push to `main` (Workers Builds auto-deploys).

## Integration Notes

- Sibling plan `mobile-bottom-nav-sheet.md`: **zero shared files** → merge order is free; both may run on parallel branches.
- Only external consumers of the changed signatures are the `hutang` route and `db.test.ts` (grep-verified), both updated here.
- `ConfirmModal` / `ModalShell` are imported by the hutang page but not modified here; the nav plan modifies `ModalShell` — no textual conflict with this plan.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1. Tests (`db.test.ts`) | builder | - | Inline: TDD red step, needs a real `npm run test` run |
| 2. Impl (`db.ts`) | builder | - | Inline: sequential after tests, same file cluster/context |
| 3. Route + UI (`hutang/*`) | builder | - | Inline: 2 small files, needs the frozen interface in context |
| 4. Docs (`docs/data-model.md`) | documenter | A | Independent file; only needs the final interface |
| 5. Review code diff | reviewer | A | Read-only; runs alongside step 4, no write conflict |

- Steps 1 → 2 → 3 are a strict TDD chain (do not parallelize).
- Batch A = steps 4 + 5 in one message, after step 3 completes.
- Builder owns step 3 inline: two-line action change plus copy edits — delegation overhead exceeds the work.
