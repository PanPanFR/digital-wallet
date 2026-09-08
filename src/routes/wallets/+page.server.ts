import { fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad, RequestEvent } from '@sveltejs/kit';
import { createWallet, deleteWallet, getWalletBalances, updateWallet } from '$lib/server/db';
import { WalletSchema, fieldErrors } from '$lib/server/validation';

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	return { wallets: await getWalletBalances(db) };
};

export const actions: Actions = {
	create: async ({ request, platform }: RequestEvent) => {
		const parsed = WalletSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await createWallet(platform!.env.DB, parsed.data);
		return { success: true };
	},

	update: async ({ request, platform }: RequestEvent) => {
		const form = Object.fromEntries(await request.formData());
		const id = String(form.id ?? '');
		if (!id) return fail(400, { errors: { id: 'ID dompet tidak ditemukan' } });
		const parsed = WalletSchema.safeParse(form);
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await updateWallet(platform!.env.DB, id, parsed.data);
		return { success: true };
	},

	delete: async ({ request, platform }: RequestEvent) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id) return fail(400, { error: 'ID dompet tidak ditemukan' });
		const result = await deleteWallet(platform!.env.DB, id);
		if (result === 'has-transactions')
			return fail(400, { error: 'Dompet masih punya transaksi. Hapus/pindahkan transaksinya dulu.' });
		if (result === 'not-found') return fail(404, { error: 'Dompet tidak ditemukan' });
		return { success: true };
	}
};
