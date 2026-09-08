import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { reportAnswer } from '$lib/server/ai';
import { getCategoryTotals, getMonthlySummary, getWalletBalances } from '$lib/server/db';

const ReportSchema = z.object({
	question: z.string().trim().min(1, 'Pertanyaan tidak boleh kosong').max(500)
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

	const parsed = ReportSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) {
		return json({ error: 'Pertanyaan tidak boleh kosong (maks. 500 karakter)' }, { status: 400 });
	}

	const db = platform!.env.DB;
	const month = new Date().toISOString().slice(0, 7);
	const [summary, categories, wallets] = await Promise.all([
		getMonthlySummary(db, month),
		getCategoryTotals(db, month),
		getWalletBalances(db)
	]);
	const summaryJson = JSON.stringify({ month, summary, categories, walletBalances: wallets });

	try {
		const answer = await reportAnswer(apiKey, parsed.data.question, summaryJson);
		return json({ answer });
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses AI' },
			{ status: 502 }
		);
	}
};
