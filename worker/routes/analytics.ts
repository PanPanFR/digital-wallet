import { Hono } from 'hono';
import {
	getCategoryTotals,
	getMonthlySummary,
	getMonthlyTotals,
	getWalletTotals
} from '../db';
import type { Env } from '../env';

const MONTH_RE = /^\d{4}-\d{2}$/;

function monthOrCurrent(v: string | undefined): string {
	return v && MONTH_RE.test(v) ? v : new Date().toISOString().slice(0, 7);
}

export const analyticsRoute = new Hono<{ Bindings: Env }>();
export const analyticsRoutes = analyticsRoute;

analyticsRoute.get('/', async (c) => {
	const db = c.env.DB;
	const month = monthOrCurrent(c.req.query('month'));
	const [summary, categoryTotals, walletTotals, trend] = await Promise.all([
		getMonthlySummary(db, month),
		getCategoryTotals(db, month),
		getWalletTotals(db, month),
		getMonthlyTotals(db, 6)
	]);
	return c.json({ month, summary, categoryTotals, walletTotals, trend });
});

export default analyticsRoute;
