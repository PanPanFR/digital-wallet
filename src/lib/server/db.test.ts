import { describe, it, expect } from 'vitest';
import { getKindTotals, getWalletBalances, deleteWallet, listWallets, updateWallet } from './db';

function fakeDb(rows: unknown[]) {
	const result = {
		all: async () => ({ results: rows }),
		first: async () => rows[0] ?? null,
		run: async () => ({ meta: { changes: 1 } })
	};
	return {
		prepare: () => ({ ...result, bind: () => result })
	} as unknown as D1Database;
}

describe('getKindTotals', () => {
	it('sums digital/cash and computes combined total', async () => {
		const t = await getKindTotals(
			fakeDb([
				{ kind: 'digital', balance: 150000 },
				{ kind: 'cash', balance: 50000 }
			])
		);
		expect(t).toEqual({ digital: 150000, cash: 50000, total: 200000 });
	});
	it('zero-fills missing kinds', async () => {
		const t = await getKindTotals(fakeDb([{ kind: 'cash', balance: 10000 }]));
		expect(t).toEqual({ digital: 0, cash: 10000, total: 10000 });
	});
});

describe('getWalletBalances', () => {
	it('maps rows with numeric balance', async () => {
		const w = await getWalletBalances(
			fakeDb([{ id: 'a', name: 'GoPay', kind: 'digital', created_at: 'x', balance: '25000' }])
		);
		expect(w[0].balance).toBe(25000);
	});
});

describe('deleteWallet', () => {
	it('refuses when wallet has transactions', async () => {
		const calls: string[] = [];
		const db = {
			prepare: (sql: string) => {
				calls.push(sql);
				return {
					bind: () => ({
						first: async () => (calls[0].includes('COUNT') ? { n: 3 } : null),
						run: async () => ({ meta: { changes: 0 } })
					})
				};
			}
		} as unknown as D1Database;
		expect(await deleteWallet(db, 'x')).toBe('has-transactions');
	});

	it('deletes when unused', async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({ n: 0 }),
					run: async () => ({ meta: { changes: 1 } })
				})
			})
		} as unknown as D1Database;
		expect(await deleteWallet(db, 'x')).toBe('deleted');
	});
});

describe('listWallets', () => {
	it('returns rows', async () => {
		const w = await listWallets(fakeDb([{ id: 'a', name: 'Tunai', kind: 'cash', created_at: 'x' }]));
		expect(w).toHaveLength(1);
		expect(w[0].name).toBe('Tunai');
	});
});

describe('updateWallet', () => {
	it('returns true on change', async () => {
		expect(await updateWallet(fakeDb([]), 'x', { name: 'Baru' })).toBe(true);
	});
	it('returns false when nothing to update', async () => {
		expect(await updateWallet(fakeDb([]), 'x', {})).toBe(false);
	});
});
