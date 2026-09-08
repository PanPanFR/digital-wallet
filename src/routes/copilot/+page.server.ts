import { fail, redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { createTransactions, listWallets } from '$lib/server/db';

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const wallets = await listWallets(platform!.env.DB);
	return { wallets };
};

const BulkSchema = z.array(
	z.object({
		walletId: z.string().trim().min(1),
		description: z.string().trim().min(1),
		amount: z.number().int().positive().max(999_999_999),
		category: z.string().trim().min(1).default('Lainnya'),
		type: z.enum(['income', 'expense'])
	})
);

export const actions: Actions = {
	'create-bulk': async ({ request, platform }: RequestEvent) => {
		const itemsRaw = String((await request.formData()).get('items') ?? '[]');
		let json: unknown;
		try {
			json = JSON.parse(itemsRaw);
		} catch {
			return fail(400, { error: 'Data transaksi tidak valid' });
		}
		const parsed = BulkSchema.safeParse(json);
		if (!parsed.success) return fail(400, { error: 'Data transaksi tidak valid' });
		if (parsed.data.length === 0) return fail(400, { error: 'Tidak ada transaksi dipilih' });

		const count = await createTransactions(
			platform!.env.DB,
			parsed.data.map((d) => ({ ...d, wallet_id: d.walletId }))
		);
		return { success: true, count };
	}
};
