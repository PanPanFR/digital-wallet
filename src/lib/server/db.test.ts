import { describe, it, expect } from 'vitest';
import {
	getKindTotals,
	getWalletBalances,
	deleteWallet,
	listWallets,
	createWallet,
	updateWallet,
	adjustWalletBalance,
	listTransactions,
	getMonthlySummary,
	getCategoryTotals,
	getMonthlyTotals,
	getWalletTotals,
	listDebts,
	listOpenDebts,
	createDebt,
	addDebtPayment,
	deleteDebt,
	getDebtDirectionTotals
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

describe('duplicate wallet name guard', () => {
	it('createWallet compares case/whitespace-insensitively via SQL', async () => {
		const { db, calls } = recordingDb([{ n: 1 }]);
		const res = await createWallet(db, { name: ' gopay ', kind: 'digital' });
		expect(res).toBe('duplicate');
		expect(calls).toHaveLength(1); // no INSERT attempted
		expect(calls[0].sql).toContain('lower(trim(name)) = lower(trim(?))');
		expect(calls[0].binds).toEqual([' gopay ']);
	});
	it('createWallet inserts when name is free', async () => {
		const { db, calls } = recordingDb([{ n: 0 }]);
		const id = await createWallet(db, { name: 'GoPay', kind: 'digital' });
		expect(typeof id).toBe('string');
		expect(calls[1].sql).toContain('INSERT INTO wallets');
	});
	it('updateWallet rejects a colliding rename', async () => {
		const { db, calls } = recordingDb([{ n: 1 }]);
		const res = await updateWallet(db, 'w1', { name: 'GoPay' });
		expect(res).toBe('duplicate');
		expect(calls).toHaveLength(1); // no UPDATE attempted
	});
	it('updateWallet allows self-update (excludes own id)', async () => {
		const { db, calls } = recordingDb([{ n: 0 }]);
		const res = await updateWallet(db, 'w1', { name: 'GoPay' });
		expect(res).toBe(true);
		expect(calls[0].binds).toEqual(['GoPay', 'w1']);
	});
});

describe('adjustWalletBalance', () => {
	const wallet = {
		id: 'w1',
		name: 'GoPay',
		kind: 'digital',
		created_at: 'x',
		balance: 100000
	};
	it('creates an expense tx when lowering the balance', async () => {
		const { db, calls } = recordingDb([wallet]);
		const res = await adjustWalletBalance(db, 'w1', 40000);
		expect(res).toBe('adjusted');
		const insert = calls.find((c) => c.sql.includes('INSERT INTO transactions'))!;
		expect(insert.binds).toEqual(
			expect.arrayContaining(['w1', 'Penyesuaian saldo', 60000, 'Lainnya', 'expense'])
		);
	});
	it('creates an income tx when raising the balance', async () => {
		const { db, calls } = recordingDb([{ ...wallet, balance: 40000 }]);
		const res = await adjustWalletBalance(db, 'w1', 100000);
		expect(res).toBe('adjusted');
		const insert = calls.find((c) => c.sql.includes('INSERT INTO transactions'))!;
		expect(insert.binds).toEqual(
			expect.arrayContaining(['w1', 'Penyesuaian saldo', 60000, 'Lainnya', 'income'])
		);
	});
	it('no-change when target equals current balance, no tx created', async () => {
		const { db, calls } = recordingDb([wallet]);
		const res = await adjustWalletBalance(db, 'w1', 100000);
		expect(res).toBe('no-change');
		expect(calls.some((c) => c.sql.includes('INSERT INTO transactions'))).toBe(false);
	});
	it('not-found for a missing wallet', async () => {
		const { db } = recordingDb([]);
		expect(await adjustWalletBalance(db, 'nope', 100000)).toBe('not-found');
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

/** Fake D1 that records batched statements (sql + binds) for money-path assertions. */
function batchDb(rows: unknown[] = []) {
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
			return stmts.map(() => ({ meta: {} }));
		}
	};
	return { db: db as unknown as D1Database, batched };
}

describe('listDebts', () => {
	it('maps rows and computes numeric remaining', async () => {
		const rows = [
			{
				id: 'd1',
				person: 'Budi',
				direction: 'owe',
				amount: '500000',
				paid: '200000',
				remaining: '300000',
				wallet_id: null,
				wallet_name: null,
				date: '2026-09-01',
				created_at: 'x',
				updated_at: 'x'
			}
		];
		const r = await listDebts(fakeDb(rows));
		expect(r[0].amount).toBe(500000);
		expect(r[0].paid).toBe(200000);
		expect(r[0].remaining).toBe(300000);
	});
});

describe('listOpenDebts', () => {
	it('filters to amount > paid', async () => {
		const { db, calls } = recordingDb();
		await listOpenDebts(db);
		expect(calls[0].sql).toContain('d.amount > d.paid');
	});
});

describe('addDebtPayment', () => {
	const oweDebt = {
		id: 'd1',
		person: 'Budi',
		direction: 'owe',
		amount: 500000,
		paid: 300000,
		remaining: 200000,
		wallet_id: null,
		wallet_name: null,
		date: '2026-09-01',
		created_at: 'x',
		updated_at: 'x'
	};
	const owedDebt = {
		id: 'd2',
		person: 'Ani',
		direction: 'owed',
		amount: 500000,
		paid: 300000,
		remaining: 200000,
		wallet_id: null,
		wallet_name: null,
		date: '2026-09-01',
		created_at: 'x',
		updated_at: 'x'
	};

	it('rejects overpay and does not batch', async () => {
		const { db, batched } = batchDb([oweDebt]);
		const res = await addDebtPayment(db, {
			debtId: 'd1',
			amount: 250000,
			walletId: 'w1',
			date: '2026-09-08'
		});
		expect(res).toBe('overpay');
		expect(batched).toHaveLength(0);
	});

	it('owe payment: expense tx, desc "Bayar utang ke", 3 batched stmts', async () => {
		const { db, batched } = batchDb([oweDebt]);
		const res = await addDebtPayment(db, {
			debtId: 'd1',
			amount: 200000,
			walletId: 'w1',
			date: '2026-09-08'
		});
		expect(res).toEqual({ id: 'd1' });
		expect(batched).toHaveLength(3);
		expect(batched[0].sql).toContain('INSERT INTO debt_payments');
		expect(batched[1].sql).toContain('INSERT INTO transactions');
		expect(batched[1].binds).toEqual(
			expect.arrayContaining(['w1', 'Bayar utang ke Budi', 200000, 'Lainnya', 'expense'])
		);
		expect(batched[2].sql).toContain('UPDATE debts SET paid = paid + ?');
	});

	it('owed payment: income tx, desc "Terima bayaran dari"', async () => {
		const { db, batched } = batchDb([owedDebt]);
		const res = await addDebtPayment(db, {
			debtId: 'd2',
			amount: 200000,
			walletId: 'w1',
			date: '2026-09-08'
		});
		expect(res).toEqual({ id: 'd2' });
		expect(batched[1].binds).toEqual(
			expect.arrayContaining(['w1', 'Terima bayaran dari Ani', 200000, 'Lainnya', 'income'])
		);
	});
});

describe('deleteDebt', () => {
	it('refuses when payments exist', async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({ n: 1 }),
					run: async () => ({ meta: { changes: 0 } })
				})
			})
		} as unknown as D1Database;
		expect(await deleteDebt(db, 'x')).toBe('has-payments');
	});
	it('deletes when clean', async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({ n: 0 }),
					run: async () => ({ meta: { changes: 1 } })
				})
			})
		} as unknown as D1Database;
		expect(await deleteDebt(db, 'x')).toBe('deleted');
	});
	it('returns not-found when no row', async () => {
		const db = {
			prepare: () => ({
				bind: () => ({
					first: async () => ({ n: 0 }),
					run: async () => ({ meta: { changes: 0 } })
				})
			})
		} as unknown as D1Database;
		expect(await deleteDebt(db, 'x')).toBe('not-found');
	});
});

describe('createDebt', () => {
	const base = {
		person: 'Budi',
		direction: 'owe' as const,
		amount: 100000,
		date: '2026-09-08',
		walletId: 'w1'
	};

	it('without reduceBalance runs a single insert, no batch', async () => {
		const { db, batched } = batchDb();
		const id = await createDebt(db, { ...base, walletId: null, reduceBalance: false });
		expect(typeof id).toBe('string');
		expect(batched).toHaveLength(0);
	});

	it('reduceBalance: 3 batched stmts (debt + payment + tx), paid set full', async () => {
		const { db, batched } = batchDb();
		const id = await createDebt(db, { ...base, walletId: 'w1', reduceBalance: true });
		expect(typeof id).toBe('string');
		expect(batched).toHaveLength(3);
		expect(batched[0].sql).toContain('INSERT INTO debts');
		expect(batched[0].binds).toEqual(
			expect.arrayContaining([id, 'Budi', 'owe', 100000, 100000, 'w1', '2026-09-08'])
		);
		expect(batched[1].sql).toContain('INSERT INTO debt_payments');
		expect(batched[2].sql).toContain('INSERT INTO transactions');
		expect(batched[2].binds).toEqual(
			expect.arrayContaining(['w1', 'Pinjam dari Budi', 100000, 'Lainnya', 'expense'])
		);
	});
});

describe('getDebtDirectionTotals', () => {
	it('sums remaining per direction from open debts', async () => {
		const rows = [
			{ id: 'd1', person: 'B', direction: 'owe', amount: 100000, paid: 40000, remaining: 60000, wallet_id: null, wallet_name: null, date: '2026-09-01', created_at: 'x', updated_at: 'x' },
			{ id: 'd2', person: 'A', direction: 'owed', amount: 200000, paid: 50000, remaining: 150000, wallet_id: null, wallet_name: null, date: '2026-09-01', created_at: 'x', updated_at: 'x' }
		];
		const t = await getDebtDirectionTotals(fakeDb(rows));
		expect(t).toEqual({ owe: 60000, owed: 150000 });
	});
});
