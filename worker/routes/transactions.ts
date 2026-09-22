import { Hono } from 'hono';
import { z } from 'zod';
import {
	createTransaction,
	deleteTransaction,
	deleteTransactions,
	listTransactions,
	updateTransaction
} from '../db';
import { TxSchema, TxUpdateSchema, fieldErrors } from '../../shared/validation';
import type { Env } from '../env';

export const transactionRoutes = new Hono<{ Bindings: Env }>();

transactionRoutes.get('/', async (c) => {
	const month = c.req.query('month') || undefined;
	const walletParam = c.req.query('walletId') || c.req.query('wallet') || undefined;
	const kindParam = c.req.query('kind');
	const kind =
		kindParam === 'digital' || kindParam === 'cash'
			? kindParam
			: walletParam === 'digital' || walletParam === 'cash'
				? walletParam
				: undefined;
	const walletId = kind ? undefined : walletParam;
	const search = c.req.query('search') || c.req.query('q') || undefined;
	const category = c.req.query('category') || undefined;
	const limitParam = parseInt(c.req.query('limit') ?? '', 10);
	const limit = Number.isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 200);
	const offsetParam = parseInt(c.req.query('offset') ?? '', 10);
	const offset = Number.isNaN(offsetParam) ? 0 : Math.max(offsetParam, 0);

	const rows = await listTransactions(c.env.DB, {
		limit,
		offset,
		month,
		walletId,
		kind,
		search,
		category
	});

	const hasMore = rows.length === limit;
	return c.json({ transactions: rows, hasMore, offset, limit });
});

transactionRoutes.post('/', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const parsed = TxSchema.safeParse(body);
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);

	const { walletId, toWalletId, ...rest } = parsed.data;
	const id = await createTransaction(c.env.DB, {
		...rest,
		wallet_id: walletId,
		to_wallet_id: rest.type === 'transfer' ? toWalletId : null
	});

	return c.json({ id }, 201);
});

transactionRoutes.patch('/:id', async (c) => {
	const id = c.req.param('id');
	if (!id) return c.json({ error: 'ID transaksi tidak ditemukan' }, 400);

	const body = await c.req.json().catch(() => ({}));
	const parsed = TxUpdateSchema.safeParse(body);
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);

	const { walletId, toWalletId, ...rest } = parsed.data;
	const updated = await updateTransaction(c.env.DB, id, {
		...rest,
		...(walletId !== undefined ? { wallet_id: walletId } : {}),
		...(toWalletId !== undefined ? { to_wallet_id: toWalletId } : {})
	});

	if (!updated) return c.json({ error: 'Transaksi tidak ditemukan' }, 404);
	return c.json({ ok: true });
});

transactionRoutes.delete('/:id', async (c) => {
	const id = c.req.param('id');
	if (!id) return c.json({ error: 'ID transaksi tidak ditemukan' }, 400);

	const deleted = await deleteTransaction(c.env.DB, id);
	if (!deleted) return c.json({ error: 'Transaksi tidak ditemukan' }, 404);
	return c.json({ ok: true });
});

const BulkDeleteSchema = z.object({
	ids: z.union([z.array(z.string().min(1)), z.string()]).transform((v) => {
		if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
		return v.split(',').map((s) => s.trim()).filter(Boolean);
	})
});

transactionRoutes.post('/bulk-delete', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const parsed = BulkDeleteSchema.safeParse(body);
	if (!parsed.success || parsed.data.ids.length === 0) {
		return c.json({ error: 'Pilih transaksi dulu' }, 400);
	}

	const deleted = await deleteTransactions(c.env.DB, [...new Set(parsed.data.ids)]);
	return c.json({ deleted });
});

export default transactionRoutes;
