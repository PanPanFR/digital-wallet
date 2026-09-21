import { Hono } from 'hono';
import { z } from 'zod';
import {
	adjustWalletBalance,
	createWallet,
	deleteWallet,
	getWalletBalances,
	updateWallet
} from '../db';
import { WalletSchema, fieldErrors } from '../../shared/validation';
import type { Env } from '../env';

const DUP_MSG = 'Dompet dengan nama itu sudah ada';
const AdjustSchema = z.object({
	balance: z.coerce.number().int().min(0).max(999_999_999_999)
});
const InitialBalanceSchema = z.object({
	initialBalance: z.coerce.number().int().min(0).max(999_999_999_999).default(0)
});

export const walletsRoute = new Hono<{ Bindings: Env }>();

walletsRoute.get('/', async (c) => {
	return c.json({ wallets: await getWalletBalances(c.env.DB) });
});

walletsRoute.post('/', async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	const parsed = WalletSchema.safeParse(body);
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);
	const balanceParsed = InitialBalanceSchema.safeParse(body);
	if (!balanceParsed.success) return c.json({ errors: fieldErrors(balanceParsed.error) }, 400);
	const result = await createWallet(c.env.DB, parsed.data);
	if (result === 'duplicate') return c.json({ errors: { name: DUP_MSG }, code: 'duplicate' }, 409);
	if (balanceParsed.data.initialBalance > 0) {
		await adjustWalletBalance(c.env.DB, result, balanceParsed.data.initialBalance);
	}
	return c.json({ id: result }, 201);
});

walletsRoute.patch('/:id', async (c) => {
	const id = c.req.param('id');
	if (!id) return c.json({ error: 'ID dompet tidak ditemukan' }, 400);
	const parsed = WalletSchema.partial().safeParse(await c.req.json().catch(() => ({})));
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);
	const result = await updateWallet(c.env.DB, id, parsed.data);
	if (result === 'duplicate') return c.json({ errors: { name: DUP_MSG }, code: 'duplicate' }, 409);
	if (!result) return c.json({ error: 'Dompet tidak ditemukan' }, 404);
	return c.json({ ok: true });
});

walletsRoute.delete('/:id', async (c) => {
	const result = await deleteWallet(c.env.DB, c.req.param('id'));
	if (result === 'has-transactions') {
		return c.json(
			{
				error: 'Dompet masih punya transaksi. Hapus/pindahkan transaksinya dulu.',
				code: 'has-transactions'
			},
			409
		);
	}
	if (result === 'not-found') return c.json({ error: 'Dompet tidak ditemukan' }, 404);
	return c.json({ ok: true });
});

/** "Atur Saldo": posts one adjustment transaction for the diff. Accepts {balance} (or legacy {newBalance}). */
walletsRoute.post('/:id/adjust', async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	if (body.balance === undefined && body.newBalance !== undefined) body.balance = body.newBalance;
	const parsed = AdjustSchema.safeParse(body);
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);
	const result = await adjustWalletBalance(c.env.DB, c.req.param('id'), parsed.data.balance);
	if (result === 'not-found') return c.json({ error: 'Dompet tidak ditemukan' }, 404);
	return c.json({ ok: true, status: result });
});

export default walletsRoute;
