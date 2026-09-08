import { describe, it, expect } from 'vitest';
import {
	getKindTotals,
	getWalletBalances,
	deleteWallet,
	listWallets,
	updateWallet,
	listTransactions,
	getMonthlySummary,
	getCategoryTotals,
	getMonthlyTotals,
	getWalletTotals
} from './db';

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

/** Fake D1 that records every prepared SQL + binds so tests can assert query shape. */
function recordingDb(rows: unknown[] = []) {
	const calls: { sql: string; binds: unknown[] }[] = [];
	const db = {
		prepare: (sql: string) => {
			const entry = { sql, binds: [] as unknown[] };
			calls.push(entry);
			const result = {
				all: async () => ({ results: rows }),
				first: async () => rows[0] ?? null,
				run: async () => ({ meta: { changes: 1 } })
			};
			return { ...result, bind: (...b: unknown[]) => ((entry.binds = b), result) };
		}
	};
	return { db: db as unknown as D1Database, calls };
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

describe('listTransactions filters', () => {
	it('adds search + category predicates and binds them', async () => {
		const { db, calls } = recordingDb();
		await listTransactions(db, { search: 'kopi', category: 'Makanan', month: '2026-09' });
		const sql = calls[0].sql;
		expect(sql).toContain('t.description LIKE ?');
		expect(sql).toContain('t.category = ?');
		expect(sql).toContain('t.date LIKE ?');
		// month bind on date column, search wrapped in %, category exact
		expect(calls[0].binds).toEqual(['2026-09%', '%kopi%', 'Makanan', 100, 0]);
	});
	it('joins destination wallet name for transfer rows', async () => {
		const { db, calls } = recordingDb();
		await listTransactions(db, {});
		expect(calls[0].sql).toContain('dest_wallet_name');
		expect(calls[0].sql).toContain('LEFT JOIN wallets w2');
	});
});

describe('deleteWallet transfer guard', () => {
	it('usage check counts to_wallet_id too', async () => {
		const { db, calls } = recordingDb();
		// first() returns a row with n>0 so it short-circuits to has-transactions
		const dbWithUsage = {
			prepare: (sql: string) => {
				calls.push({ sql, binds: [] });
				return {
					bind: () => ({
						first: async () => ({ n: 1 }),
						run: async () => ({ meta: { changes: 0 } })
					})
				};
			}
		} as unknown as D1Database;
		expect(await deleteWallet(dbWithUsage, 'x')).toBe('has-transactions');
		expect(calls[0].sql).toContain('to_wallet_id');
	});
});

describe('getWalletTotals', () => {
	it('maps rows to numeric totals per wallet', async () => {
		const rows = [
			{ id: 'a', name: 'GoPay', kind: 'digital', total: '30000' },
			{ id: 'b', name: 'Tunai', kind: 'cash', total: 0 }
		];
		const t = await getWalletTotals(fakeDb(rows), '2026-09');
		expect(t).toEqual([
			{ id: 'a', name: 'GoPay', kind: 'digital', total: 30000 },
			{ id: 'b', name: 'Tunai', kind: 'cash', total: 0 }
		]);
	});
	it('filters by month on date column and excludes transfers', async () => {
		const { db, calls } = recordingDb();
		await getWalletTotals(db, '2026-09');
		expect(calls[0].sql).toContain('t.date LIKE ?');
		expect(calls[0].binds).toEqual(['2026-09%']);
	});
});
