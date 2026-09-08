import { describe, it, expect } from 'vitest';
import { TxSchema, WalletSchema } from './validation';

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

describe('WalletSchema', () => {
	it('rejects unknown kind', () =>
		expect(WalletSchema.safeParse({ name: 'GoPay', kind: 'crypto' }).success).toBe(false));
	it('accepts digital/cash', () =>
		expect(WalletSchema.safeParse({ name: 'GoPay', kind: 'digital' }).success).toBe(true));
	it('rejects empty name', () =>
		expect(WalletSchema.safeParse({ name: '  ', kind: 'cash' }).success).toBe(false));
});
