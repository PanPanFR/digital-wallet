import { describe, it, expect } from 'vitest';
import { TxSchema, WalletSchema, fieldErrors } from './validation';

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
