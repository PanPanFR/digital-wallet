import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, ServerLoad, RequestEvent } from '@sveltejs/kit';
import {
	createTransaction,
	deleteTransaction,
	listTransactions,
	updateTransaction
} from '$lib/server/db';

const TxSchema = z.object({
	description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
	amount: z.coerce.number().positive('Jumlah harus lebih dari 0'),
	category: z.string().trim().min(1).default('Lainnya'),
	type: z.enum(['income', 'expense'], { message: 'Tipe tidak valid' })
});

function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? 'form');
		if (!out[key]) out[key] = issue.message;
	}
	return out;
}

export const load: ServerLoad = async ({ locals, platform, url }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	const monthParam = url.searchParams.get('month');
	const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : undefined;
	const transactions = await listTransactions(db, { limit: 50, month });
	return { transactions, month: month ?? null };
};

export const actions: Actions = {
	create: async ({ request, platform }: RequestEvent) => {
		const parsed = TxSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await createTransaction(platform!.env.DB, parsed.data);
		return { success: true };
	},

	update: async ({ request, platform }: RequestEvent) => {
		const form = Object.fromEntries(await request.formData());
		const id = String(form.id ?? '');
		if (!id) return fail(400, { errors: { id: 'ID transaksi tidak ditemukan' } });
		const parsed = TxSchema.safeParse(form);
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await updateTransaction(platform!.env.DB, id, parsed.data);
		return { success: true };
	},

	delete: async ({ request, platform }: RequestEvent) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id) return fail(400, { errors: { id: 'ID transaksi tidak ditemukan' } });
		await deleteTransaction(platform!.env.DB, id);
		return { success: true };
	}
};
