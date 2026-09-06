import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { parseTransactions } from '$lib/server/ai';

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
		const transactions = await parseTransactions(apiKey, parsed.data.text);
		return json({ transactions });
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses AI' },
			{ status: 502 }
		);
	}
};
