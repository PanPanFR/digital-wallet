import { z } from 'zod';
import { todayISO } from '$lib/format';

/** Real-ish calendar date: 4-digit year, month 01-12, day 01-31 (calendar edge days not checked). */
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Shared transaction create/update validation (money path — single source of truth). */
export const TxSchema = z
	.object({
		walletId: z.string().trim().min(1, 'Pilih dompet dulu'),
		toWalletId: z.string().trim().default(''),
		description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
		amount: z.coerce
			.number()
			.int('Jumlah harus bilangan bulat')
			.positive('Jumlah harus lebih dari 0')
			.max(999_999_999, 'Jumlah terlalu besar'),
		category: z.string().trim().min(1).default('Lainnya'),
		type: z.enum(['income', 'expense', 'transfer'], { message: 'Tipe tidak valid' }),
		// Empty string (untouched form input) counts as "today"; invalid formats error out.
		date: z.preprocess(
			(v) => (v === '' || v === undefined ? todayISO() : v),
			z.string().regex(DATE_RE, 'Tanggal tidak valid')
		)
	})
	.refine((t) => t.type !== 'transfer' || (t.toWalletId !== '' && t.toWalletId !== t.walletId), {
		message: 'Pilih dompet tujuan yang berbeda',
		path: ['toWalletId']
	});

/** Wallet create/update validation. */
export const WalletSchema = z.object({
	name: z.string().trim().min(1, 'Nama dompet wajib diisi').max(50, 'Nama terlalu panjang'),
	kind: z.enum(['digital', 'cash'], { message: 'Jenis tidak valid' })
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? 'form');
		if (!out[key]) out[key] = issue.message;
	}
	return out;
}
