import { fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad, RequestEvent } from '@sveltejs/kit';
import {
	createTransaction,
	deleteTransaction,
	listTransactions,
	listWallets,
	updateTransaction
} from '$lib/server/db';
import { TxSchema, fieldErrors } from '$lib/server/validation';

export const load: ServerLoad = async ({ locals, platform, url }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	const monthParam = url.searchParams.get('month');
	const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : undefined;
	// ?wallet= holds either a kind ('digital'|'cash') or a wallet id.
	const walletParam = url.searchParams.get('wallet') || undefined;
	const kind = walletParam === 'digital' || walletParam === 'cash' ? walletParam : undefined;
	const q = url.searchParams.get('q') || undefined;
	const category = url.searchParams.get('category') || undefined;
	const offsetParam = parseInt(url.searchParams.get('offset') ?? '', 10);
	const offset = Number.isNaN(offsetParam) ? 0 : offsetParam;
	const limit = 50;
	const wallets = await listWallets(db);
	const rows = await listTransactions(db, {
		limit,
		offset,
		month,
		walletId: kind ? undefined : walletParam,
		search: q,
		category
	});
	// hasMore computed on raw rows, before the client-visible kind filter.
	const hasMore = rows.length === limit;
	const transactions = kind ? rows.filter((t) => t.wallet_kind === kind) : rows;
	return {
		transactions,
		wallets,
		month: month ?? null,
		wallet: walletParam ?? null,
		q: q ?? '',
		category: category ?? '',
		offset,
		hasMore
	};
};

export const actions: Actions = {
	create: async ({ request, platform }: RequestEvent) => {
		const parsed = TxSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const { walletId, toWalletId, ...rest } = parsed.data;
		await createTransaction(platform!.env.DB, {
			...rest,
			wallet_id: walletId,
			to_wallet_id: rest.type === 'transfer' ? toWalletId : null
		});
		return { success: true };
	},

	update: async ({ request, platform }: RequestEvent) => {
		const form = Object.fromEntries(await request.formData());
		const id = String(form.id ?? '');
		if (!id) return fail(400, { errors: { id: 'ID transaksi tidak ditemukan' } });
		const parsed = TxSchema.safeParse(form);
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const { walletId, toWalletId, ...rest } = parsed.data;
		await updateTransaction(platform!.env.DB, id, {
			...rest,
			wallet_id: walletId,
			to_wallet_id: rest.type === 'transfer' ? toWalletId : null
		});
		return { success: true };
	},

	delete: async ({ request, platform }: RequestEvent) => {
		const id = String((await request.formData()).get('id') ?? '');
		if (!id) return fail(400, { errors: { id: 'ID transaksi tidak ditemukan' } });
		await deleteTransaction(platform!.env.DB, id);
		return { success: true };
	}
};
