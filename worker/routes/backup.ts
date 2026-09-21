import { Hono } from 'hono';
import { exportAllData, importBackupData, listTransactions } from '../db';
import { BackupSchema, fieldErrors } from '../../shared/validation';
import type { Env } from '../env';

export const backupRoutes = new Hono<{ Bindings: Env }>();
export const backupRoute = backupRoutes;

const CSV_COLUMNS = ['date', 'description', 'category', 'type', 'amount', 'wallet_id', 'to_wallet_id'] as const;

/** Quote a CSV field when it contains a comma, quote, or newline. */
export function toCsvField(v: string | number | null): string {
	const s = v === null ? '' : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// JSON export handler
async function handleJsonExport(c: any) {
	const data = await exportAllData(c.env.DB);
	const stamp = new Date().toISOString().slice(0, 10);
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'content-type': 'application/json',
			'content-disposition': `attachment; filename="digital-wallet-backup-${stamp}.json"`
		}
	});
}

// CSV export handler
async function handleCsvExport(c: any) {
	const monthParam = c.req.query('month');
	const month =
		monthParam && /^\d{4}-\d{2}$/.test(monthParam)
			? monthParam
			: new Date().toISOString().slice(0, 7);

	const limitRaw = parseInt(c.req.query('limit') ?? '', 10);
	const limit = Number.isNaN(limitRaw) ? 5000 : Math.min(Math.max(limitRaw, 1), 5000);

	const rows = await listTransactions(c.env.DB, {
		limit,
		month,
		walletId: c.req.query('walletId') || undefined,
		search: c.req.query('search') || c.req.query('q') || undefined,
		category: c.req.query('category') || undefined
	});

	const lines = [
		CSV_COLUMNS.join(','),
		...rows.map((t) => CSV_COLUMNS.map((col) => toCsvField(t[col])).join(','))
	];

	return new Response(lines.join('\n'), {
		headers: {
			'content-type': 'text/csv',
			'content-disposition': `attachment; filename="transaksi-${month}.csv"`
		}
	});
}

backupRoutes.get('/export', async (c) => {
	const format = c.req.query('format') ?? 'json';
	if (format === 'csv') return handleCsvExport(c);
	return handleJsonExport(c);
});

backupRoutes.get('/export.csv', async (c) => {
	return handleCsvExport(c);
});

backupRoutes.post('/import', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const parsed = BackupSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ errors: fieldErrors(parsed.error), error: 'Format backup tidak valid' }, 400);
	}

	try {
		const { inserted, skipped } = await importBackupData(c.env.DB, parsed.data);
		return c.json({ success: true, inserted, skipped });
	} catch (e) {
		return c.json(
			{ error: e instanceof Error ? e.message : 'Gagal mengimpor backup' },
			400
		);
	}
});

export default backupRoutes;
