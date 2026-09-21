import { describe, it, expect } from 'vitest';
import { TxSchema, WalletSchema, DebtSchema, DebtPaymentSchema, BackupSchema, fieldErrors } from './validation';

describe('TxSchema', () => {
	it('requires walletId', () => {
		const r = TxSchema.safeParse({ description: 'x', amount: 100, type: 'expense' });
		expect(r.success).toBe(false);
	});
	it('accepts valid wallet payload', () => {
		const r = TxSchema.safeParse({
			walletId: 'w1',
			description: 'nasi goreng',
			amount: 25000,
			type: 'expense',
			category: 'Makanan'
		});
		expect(r.success).toBe(true);
	});
});

describe('TxSchema date', () => {
	it('defaults empty date to today (YYYY-MM-DD)', () => {
		const r = TxSchema.safeParse({
			walletId: 'w1',
			description: 'x',
			amount: 100,
			type: 'expense',
			date: ''
		});
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
	it('defaults missing date to today', () => {
		const r = TxSchema.safeParse({ walletId: 'w1', description: 'x', amount: 100, type: 'expense' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
	it('rejects impossible month/day', () => {
		const r = TxSchema.safeParse({
			walletId: 'w1',
			description: 'x',
			amount: 100,
			type: 'expense',
			date: '2026-13-40'
		});
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).date).toBe('Tanggal tidak valid');
	});
	it('keeps a valid date', () => {
		const r = TxSchema.safeParse({
			walletId: 'w1',
			description: 'x',
			amount: 100,
			type: 'expense',
			date: '2026-09-05'
		});
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.date).toBe('2026-09-05');
	});
});

describe('TxSchema transfer', () => {
	const base = { walletId: 'w1', description: 'x', amount: 100, date: '2026-09-05' };
	it('requires a distinct toWalletId for transfer', () => {
		const r = TxSchema.safeParse({ ...base, type: 'transfer' });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).toWalletId).toBeTruthy();
	});
	it('rejects transfer to the same wallet', () => {
		const r = TxSchema.safeParse({ ...base, type: 'transfer', toWalletId: 'w1' });
		expect(r.success).toBe(false);
	});
	it('accepts a valid transfer', () => {
		const r = TxSchema.safeParse({ ...base, type: 'transfer', toWalletId: 'w2' });
		expect(r.success).toBe(true);
	});
	it('income/expense ignore toWalletId', () => {
		const r = TxSchema.safeParse({ ...base, type: 'income', toWalletId: 'w2' });
		expect(r.success).toBe(true);
	});
});

describe('WalletSchema', () => {
	it('rejects unknown kind', () =>
		expect(WalletSchema.safeParse({ name: 'GoPay', kind: 'crypto' }).success).toBe(false));
	it('accepts digital/cash', () =>
		expect(WalletSchema.safeParse({ name: 'GoPay', kind: 'digital' }).success).toBe(true));
	it('rejects empty name', () =>
		expect(WalletSchema.safeParse({ name: '  ', kind: 'cash' }).success).toBe(false));
});

describe('DebtSchema', () => {
	const base = { person: 'Budi', direction: 'owe', amount: 100000, date: '2026-09-08' };

	it('rejects empty person', () => {
		const r = DebtSchema.safeParse({ ...base, person: '  ' });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).person).toBeTruthy();
	});
	it('rejects amount <= 0', () => {
		const r = DebtSchema.safeParse({ ...base, amount: 0 });
		expect(r.success).toBe(false);
	});
	it('rejects malformed date', () => {
		const r = DebtSchema.safeParse({ ...base, date: '2026-13-40' });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).date).toBe('Tanggal tidak valid');
	});
	it('rejects invalid direction', () => {
		const r = DebtSchema.safeParse({ ...base, direction: 'left' });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).direction).toBeTruthy();
	});
	it('accepts owe + owed', () => {
		expect(DebtSchema.safeParse({ ...base, direction: 'owe' }).success).toBe(true);
		expect(DebtSchema.safeParse({ ...base, direction: 'owed' }).success).toBe(true);
	});
	it('defaults date to todayISO when missing', () => {
		const r = DebtSchema.safeParse({ person: 'Budi', direction: 'owe', amount: 100000 });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('DebtSchema reduceBalance', () => {
	const base = { person: 'Budi', direction: 'owe', amount: 100000, date: '2026-09-08' };

	it('without walletId errors when reduceBalance is on', () => {
		const r = DebtSchema.safeParse({ ...base, reduceBalance: 'on', walletId: '' });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).walletId).toBe('Pilih dompet dulu');
	});
	it('with walletId succeeds when reduceBalance is on', () => {
		const r = DebtSchema.safeParse({ ...base, reduceBalance: 'on', walletId: 'w1' });
		expect(r.success).toBe(true);
	});
	it('without reduceBalance ignores walletId', () => {
		const r = DebtSchema.safeParse({ ...base, walletId: '', reduceBalance: undefined });
		expect(r.success).toBe(true);
	});
});

describe('DebtPaymentSchema', () => {
	const base = { debtId: 'd1', amount: 50000, walletId: 'w1', date: '2026-09-08' };

	it('requires walletId', () => {
		const r = DebtPaymentSchema.safeParse({ ...base, walletId: '' });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).walletId).toBe('Pilih dompet dulu');
	});
	it('rejects amount <= 0', () => {
		const r = DebtPaymentSchema.safeParse({ ...base, amount: -1 });
		expect(r.success).toBe(false);
	});
	it('defaults date to todayISO when missing', () => {
		const r = DebtPaymentSchema.safeParse({ debtId: 'd1', amount: 50000, walletId: 'w1' });
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('BackupSchema', () => {
	const valid = {
		version: 1,
		exportedAt: '2026-09-13T00:00:00.000Z',
		wallets: [{ id: 'w1', name: 'Tunai', kind: 'cash', created_at: '2026-09-13T00:00:00.000Z' }],
		transactions: [
			{
				id: 't1',
				wallet_id: 'w1',
				to_wallet_id: null,
				description: 'nasi goreng',
				amount: 50000,
				category: 'Makanan',
				type: 'expense',
				date: '2026-09-13',
				created_at: '2026-09-13T00:00:00.000Z',
				updated_at: '2026-09-13T00:00:00.000Z'
			}
		],
		debts: [
			{
				id: 'd1',
				person: 'Budi',
				direction: 'owe',
				amount: 100000,
				paid: 0,
				wallet_id: null,
				date: '2026-09-13',
				created_at: '2026-09-13T00:00:00.000Z',
				updated_at: '2026-09-13T00:00:00.000Z'
			}
		],
		debt_payments: [
			{
				id: 'p1',
				debt_id: 'd1',
				amount: 50000,
				wallet_id: 'w1',
				date: '2026-09-13',
				created_at: '2026-09-13T00:00:00.000Z'
			}
		],
		ai_providers: [
			{
				id: 'a1',
				name: 'Gemini',
				baseUrl: 'https://generativelanguage.googleapis.com/v1',
				apiKey: 'secret',
				model: 'gemini-2.0-flash',
				models: ['gemini-2.0-flash']
			}
		],
		ai_active_provider: 'a1'
	};

	it('accepts a valid full backup file', () => {
		expect(BackupSchema.safeParse(valid).success).toBe(true);
	});
	it('rejects unknown version with Indonesian message', () => {
		const r = BackupSchema.safeParse({ ...valid, version: 2 });
		expect(r.success).toBe(false);
		if (!r.success) expect(fieldErrors(r.error).version).toBe('Format backup tidak didukung');
	});
	it('rejects negative amount', () => {
		const r = BackupSchema.safeParse({
			...valid,
			transactions: [{ ...valid.transactions[0], amount: -5 }]
		});
		expect(r.success).toBe(false);
	});
	it('rejects bad type enum', () => {
		const r = BackupSchema.safeParse({
			...valid,
			transactions: [{ ...valid.transactions[0], type: 'bogus' }]
		});
		expect(r.success).toBe(false);
	});
	it('rejects missing wallets key', () => {
		const { wallets: _dropped, ...rest } = valid;
		expect(BackupSchema.safeParse(rest).success).toBe(false);
	});
});
