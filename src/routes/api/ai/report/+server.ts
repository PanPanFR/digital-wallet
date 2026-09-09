import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { chatAnswer } from '$lib/server/ai';
import {
	getCategoryTotals,
	getMonthlySummary,
	getMonthlyTotals,
	getWalletBalances,
	listOpenDebts,
	listTransactions
} from '$lib/server/db';

const ChatSchema = z.object({
	question: z.string().trim().min(1, 'Pertanyaan tidak boleh kosong').max(500),
	history: z
		.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
		.max(8)
		.default([])
});

export const POST: RequestHandler = async ({ request, platform, url }) => {
	// CSRF: browser fetches always send Origin; reject when missing or mismatched.
	const origin = request.headers.get('origin');
	if (origin !== url.origin) {
		error(403, { message: 'Origin tidak valid' });
	}

	const apiKey = platform!.env.GOOGLE_API_KEY;
	if (!apiKey) {
		return json({ error: 'Fitur AI belum dikonfigurasi' }, { status: 503 });
	}

	const parsed = ChatSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) {
		return json({ error: 'Pertanyaan tidak boleh kosong (maks. 500 karakter)' }, { status: 400 });
	}

	const db = platform!.env.DB;
	const now = new Date();
	const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonth = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;

	const [wallets, summaryThis, summaryLast, categories, trend6, openDebts, recent] =
		await Promise.all([
			getWalletBalances(db),
			getMonthlySummary(db, thisMonth),
			getMonthlySummary(db, lastMonth),
			getCategoryTotals(db, thisMonth),
			getMonthlyTotals(db, 6),
			listOpenDebts(db),
			listTransactions(db, { limit: 10 })
		]);

	const contextJson = JSON.stringify({
		thisMonth,
		lastMonth,
		wallets,
		summaryThisMonth: summaryThis,
		summaryLastMonth: summaryLast,
		categories,
		trend6Months: trend6,
		openDebts,
		recent
	});

	try {
		const answer = await chatAnswer(apiKey, parsed.data.question, parsed.data.history, contextJson);
		return json({ answer });
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses AI' },
			{ status: 502 }
		);
	}
};
