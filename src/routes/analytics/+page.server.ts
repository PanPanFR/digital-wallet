import { redirect, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { getCategoryTotals, getMonthlyTotals } from '$lib/server/db';

export const load: ServerLoad = async ({ locals, platform, url }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	const monthParam = url.searchParams.get('month');
	const month =
		monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : new Date().toISOString().slice(0, 7);
	const [categoryTotals, monthlyTotals] = await Promise.all([
		getCategoryTotals(db, month),
		getMonthlyTotals(db, 6)
	]);
	return { month, categoryTotals, monthlyTotals };
};
