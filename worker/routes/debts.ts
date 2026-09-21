import { Hono } from 'hono';
import { z } from 'zod';
import {
	addDebtPayment,
	createDebt,
	deleteDebt,
	deleteDebts,
	getDebtDirectionTotals,
	listDebts
} from '../db';
import { DebtApiSchema, DebtPaymentSchema, fieldErrors } from '../../shared/validation';
import type { Env } from '../env';

export const debtRoutes = new Hono<{ Bindings: Env }>();

debtRoutes.get('/', async (c) => {
	const [debts, totals] = await Promise.all([
		listDebts(c.env.DB),
		getDebtDirectionTotals(c.env.DB)
	]);
	return c.json({ debts, totals });
});

debtRoutes.post('/', async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	// Accept reduceBalance as boolean or string ("true", "on", "1")
	if (typeof body.reduceBalance === 'string') {
		body.reduceBalance = body.reduceBalance === 'on' || body.reduceBalance === 'true' || body.reduceBalance === '1';
	}
	const parsed = DebtApiSchema.safeParse(body);
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);

	const id = await createDebt(c.env.DB, {
		person: parsed.data.person,
		direction: parsed.data.direction,
		amount: parsed.data.amount,
		date: parsed.data.date,
		walletId: parsed.data.walletId || null,
		reduceBalance: parsed.data.reduceBalance
	});

	return c.json({ id }, 201);
});

debtRoutes.post('/:id/payments', async (c) => {
	const debtId = c.req.param('id');
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	const parsed = DebtPaymentSchema.safeParse({ ...body, debtId });
	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);

	const res = await addDebtPayment(c.env.DB, {
		debtId,
		amount: parsed.data.amount,
		walletId: parsed.data.walletId,
		date: parsed.data.date
	});

	if (res === 'overpay') {
		return c.json({ error: 'Nominal melebihi sisa utang', code: 'overpay' }, 409);
	}
	if (res === 'not-found') {
		return c.json({ error: 'Utang tidak ditemukan' }, 404);
	}

	return c.json({ ok: true, id: res.id });
});

debtRoutes.delete('/:id', async (c) => {
	const id = c.req.param('id');
	const res = await deleteDebt(c.env.DB, id);
	if (res === 'not-found') return c.json({ error: 'Utang tidak ditemukan' }, 404);
	return c.json({ ok: true });
});

const BulkDeleteSchema = z.object({
	ids: z.union([z.array(z.string().min(1)), z.string()]).transform((v) => {
		if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
		return v.split(',').map((s) => s.trim()).filter(Boolean);
	})
});

debtRoutes.post('/bulk-delete', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const parsed = BulkDeleteSchema.safeParse(body);
	if (!parsed.success || parsed.data.ids.length === 0) {
		return c.json({ error: 'Pilih catatan utang dulu' }, 400);
	}

	const { deleted } = await deleteDebts(c.env.DB, [...new Set(parsed.data.ids)]);
	return c.json({ deleted });
});

export default debtRoutes;
