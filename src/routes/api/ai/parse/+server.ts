import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { parseTransactions } from '$lib/server/ai';
import { listWallets } from '$lib/server/db';

const ParseSchema = z.object({
	text: z.string().trim().min(1, 'Teks tidak boleh kosong').max(500)
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

	const parsed = ParseSchema.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) {
		return json({ error: 'Teks tidak boleh kosong (maks. 500 karakter)' }, { status: 400 });
	}

	try {
		const wallets = await listWallets(platform!.env.DB);
		const transactions = await parseTransactions(apiKey, parsed.data.text, wallets);
		const ids = new Set(wallets.map((w) => w.id));
		if (transactions.some((t) => !ids.has(t.walletId))) {
			return json({ error: 'AI memilih dompet tidak valid' }, { status: 400 });
		}
		return json({ transactions });
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses AI' },
			{ status: 502 }
		);
	}
};
