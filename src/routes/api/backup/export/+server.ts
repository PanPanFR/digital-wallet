import { json, type RequestHandler } from '@sveltejs/kit';
import { exportAllData, listTransactions } from '$lib/server/db';

const CSV_COLUMNS = ['date', 'description', 'category', 'type', 'amount', 'wallet_id', 'to_wallet_id'] as const;

/** Quote a CSV field when it contains a comma, quote, or newline. */
// ponytail: single-route helper, extract to lib/ only if a second CSV consumer appears.
export function toCsvField(v: string | number | null): string {
	const s = v === null ? '' : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET: RequestHandler = async ({ url, platform }) => {
	const format = url.searchParams.get('format') ?? 'json';
	const db = platform!.env.DB;

	if (format === 'json') {
		const data = await exportAllData(db);
		const stamp = new Date().toISOString().slice(0, 10);
		return new Response(JSON.stringify(data), {
			headers: {
				'content-type': 'application/json',
				'content-disposition': `attachment; filename="digital-wallet-backup-${stamp}.json"`
			}
		});
	}

	if (format === 'csv') {
		const monthParam = url.searchParams.get('month');
		const month =
			monthParam && /^\d{4}-\d{2}$/.test(monthParam)
				? monthParam
				: new Date().toISOString().slice(0, 7);
		// Documented cap: this is a spreadsheet report, not a full dump (use JSON for that).
		const limitRaw = parseInt(url.searchParams.get('limit') ?? '', 10);
		const limit = Number.isNaN(limitRaw) ? 5000 : Math.min(Math.max(limitRaw, 1), 5000);
		const rows = await listTransactions(db, {
			limit,
			month,
			walletId: url.searchParams.get('walletId') || undefined,
			search: url.searchParams.get('search') || undefined,
			category: url.searchParams.get('category') || undefined
		});
		const lines = [
			CSV_COLUMNS.join(','),
			...rows.map((t) => CSV_COLUMNS.map((c) => toCsvField(t[c])).join(','))
		];
		return new Response(lines.join('\n'), {
			headers: {
				'content-type': 'text/csv',
				'content-disposition': `attachment; filename="transaksi-${month}.csv"`
			}
		});
	}

	return json({ error: 'Format tidak didukung' }, { status: 400 });
};
