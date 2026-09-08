import { z } from 'zod';

/** Shared transaction create/update validation (money path — single source of truth). */
export const TxSchema = z.object({
	walletId: z.string().trim().min(1, 'Pilih dompet dulu'),
	description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
	amount: z.coerce
		.number()
		.int('Jumlah harus bilangan bulat')
		.positive('Jumlah harus lebih dari 0')
		.max(999_999_999, 'Jumlah terlalu besar'),
	category: z.string().trim().min(1).default('Lainnya'),
	type: z.enum(['income', 'expense'], { message: 'Tipe tidak valid' })
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
