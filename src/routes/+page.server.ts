import { fail, redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { sessionCookieName } from '$lib/server/auth';
import {
	createTransaction,
	getKindTotals,
	getMonthlySummary,
	getWalletBalances,
	listTransactions
} from '$lib/server/db';
import { TxSchema, fieldErrors } from '$lib/server/validation';

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	const month = new Date().toISOString().slice(0, 7);
	const [totals, wallets, recent, summary] = await Promise.all([
		getKindTotals(db),
		getWalletBalances(db),
		listTransactions(db, { limit: 5 }),
		getMonthlySummary(db, month)
	]);
	return { totals, wallets, recent, summary, month };
};

export const actions: Actions = {
	// Quick-add on the dashboard posts here; TransactionForm uses `?/create`
	// relative to the current page.
	create: async ({ request, platform }: RequestEvent) => {
		const parsed = TxSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await createTransaction(platform!.env.DB, { ...parsed.data, wallet_id: parsed.data.walletId });
		return { success: true };
	},

	logout: async ({ cookies }: RequestEvent) => {
		cookies.delete(sessionCookieName, { path: '/' });
		redirect(303, '/login');
	}
};
