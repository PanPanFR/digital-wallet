import { fail, redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import {
	createDebt,
	addDebtPayment,
	deleteDebt,
	getDebtDirectionTotals,
	listDebts,
	listWallets
} from '$lib/server/db';
import { DebtSchema, DebtPaymentSchema, fieldErrors } from '$lib/server/validation';

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	const [wallets, debts, totals] = await Promise.all([
		listWallets(db),
		listDebts(db),
		getDebtDirectionTotals(db)
	]);
	return { wallets, debts, totals };
};

export const actions: Actions = {
	create: async ({ request, platform }: RequestEvent) => {
		const parsed = DebtSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await createDebt(platform!.env.DB, {
			person: parsed.data.person,
			direction: parsed.data.direction,
			amount: parsed.data.amount,
			date: parsed.data.date,
			walletId: parsed.data.walletId || null,
			reduceBalance: parsed.data.reduceBalance === 'on'
		});
		return { success: true };
	},

	pay: async ({ request, platform }: RequestEvent) => {
		const parsed = DebtPaymentSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const res = await addDebtPayment(platform!.env.DB, {
			debtId: parsed.data.debtId,
			amount: parsed.data.amount,
			walletId: parsed.data.walletId,
			date: parsed.data.date
		});
		if (res === 'overpay') return fail(400, { error: 'Nominal melebihi sisa utang' });
		if (res === 'not-found') return fail(400, { error: 'Utang tidak ditemukan' });
		return { success: true };
	},

	delete: async ({ request, platform }: RequestEvent) => {
		const id = String((await request.formData()).get('id') ?? '');
		const res = await deleteDebt(platform!.env.DB, id);
		if (res === 'has-payments') return fail(400, { error: 'Tidak bisa dihapus: sudah ada pembayaran' });
		if (res === 'not-found') return fail(400, { error: 'Utang tidak ditemukan' });
		return { success: true };
	}
};
