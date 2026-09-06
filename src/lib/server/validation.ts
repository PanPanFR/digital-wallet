import { z } from 'zod';

/** Shared transaction create/update validation (money path — single source of truth). */
export const TxSchema = z.object({
	description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
	amount: z.coerce
		.number()
		.int('Jumlah harus bilangan bulat')
		.positive('Jumlah harus lebih dari 0')
		.max(999_999_999, 'Jumlah terlalu besar'),
	category: z.string().trim().min(1).default('Lainnya'),
	type: z.enum(['income', 'expense'], { message: 'Tipe tidak valid' })
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? 'form');
		if (!out[key]) out[key] = issue.message;
	}
	return out;
}
