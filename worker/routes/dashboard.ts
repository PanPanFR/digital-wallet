import { Hono } from 'hono';
import {
	getKindTotals,
	getMonthlySummary,
	getMonthlyTotals,
	getWalletBalances,
	listOpenDebts,
	listTransactions
} from '../db';
import type { Env } from '../env';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

dashboardRoutes.get('/', async (c) => {
	const monthParam = c.req.query('month');
	const month =
		monthParam && /^\d{4}-\d{2}$/.test(monthParam)
			? monthParam
			: new Date().toISOString().slice(0, 7);

	const [kinds, summary, balances, recent, openDebts, trend] = await Promise.all([
		getKindTotals(c.env.DB),
		getMonthlySummary(c.env.DB, month),
		getWalletBalances(c.env.DB),
		listTransactions(c.env.DB, { limit: 5 }),
		listOpenDebts(c.env.DB),
		getMonthlyTotals(c.env.DB, 6)
	]);

	return c.json({
		month,
		kinds,
		summary,
		balances,
		recent,
		openDebts,
		trend
	});
});

export default dashboardRoutes;
