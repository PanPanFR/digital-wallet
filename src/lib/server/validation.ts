import { z } from 'zod';
import { todayISO } from '$lib/format';

/** Real-ish calendar date: 4-digit year, month 01-12, day 01-31 (calendar edge days not checked). */
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Shared transaction create/update validation (money path — single source of truth). */
export const TxSchema = z
	.object({
		walletId: z.string().trim().min(1, 'Pilih dompet dulu'),
		toWalletId: z.string().trim().default(''),
		description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
		amount: z.coerce
			.number()
			.int('Jumlah harus bilangan bulat')
			.positive('Jumlah harus lebih dari 0')
			.max(999_999_999, 'Jumlah terlalu besar'),
		category: z.string().trim().min(1).default('Lainnya'),
		type: z.enum(['income', 'expense', 'transfer'], { message: 'Tipe tidak valid' }),
		// Empty string (untouched form input) counts as "today"; invalid formats error out.
		date: z.preprocess(
			(v) => (v === '' || v === undefined ? todayISO() : v),
			z.string().regex(DATE_RE, 'Tanggal tidak valid')
		)
	})
	.refine((t) => t.type !== 'transfer' || (t.toWalletId !== '' && t.toWalletId !== t.walletId), {
		message: 'Pilih dompet tujuan yang berbeda',
		path: ['toWalletId']
	});

/** Wallet create/update validation. */
export const WalletSchema = z.object({
	name: z.string().trim().min(1, 'Nama dompet wajib diisi').max(50, 'Nama terlalu panjang'),
	kind: z.enum(['digital', 'cash'], { message: 'Jenis tidak valid' })
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
	const out: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? 'form');
		if (!out[key]) out[key] = issue.message;
	}
	return out;
}

/** Debt create validation (two-way owe/owed, optional immediate balance reduction). */
export const DebtSchema = z
	.object({
		person: z.string().trim().min(1, 'Nama wajib diisi').max(60, 'Nama terlalu panjang'),
		direction: z.enum(['owe', 'owed'], { message: 'Arah tidak valid' }),
		amount: z.coerce
			.number()
			.int('Jumlah harus bilangan bulat')
			.positive('Jumlah harus lebih dari 0')
			.max(999_999_999, 'Jumlah terlalu besar'),
		date: z.preprocess(
			(v) => (v === '' || v === undefined || v === null ? todayISO() : v),
			z.string().regex(DATE_RE, 'Tanggal tidak valid')
		),
		walletId: z.string().trim().default(''),
		reduceBalance: z.string().optional()
	})
	.refine((d) => d.reduceBalance !== 'on' || d.walletId !== '', {
		message: 'Pilih dompet dulu',
		path: ['walletId']
	});

/** Debt payment validation (partial/full installment). */
export const DebtPaymentSchema = z.object({
	debtId: z.string().trim().min(1),
	amount: z.coerce
		.number()
		.int('Jumlah harus bilangan bulat')
		.positive('Jumlah harus lebih dari 0')
		.max(999_999_999, 'Jumlah terlalu besar'),
	walletId: z.string().trim().min(1, 'Pilih dompet dulu'),
	date: z.preprocess(
		(v) => (v === '' || v === undefined || v === null ? todayISO() : v),
		z.string().regex(DATE_RE, 'Tanggal tidak valid')
	)
});

/** Versioned JSON backup envelope (snake_case DB column names, no mapping layer). */
const backupId = z.string().min(1);
const backupTs = z.string().min(1);
const backupDate = z.string().regex(DATE_RE, 'Tanggal tidak valid');
const backupAmount = z
	.number()
	.int('Jumlah harus bilangan bulat')
	.positive('Jumlah harus lebih dari 0')
	.max(999_999_999, 'Jumlah terlalu besar');
/** Worker safety: cap every backup array. */
const backupList = <T extends z.ZodTypeAny>(item: T) => z.array(item).max(20000);

const BackupWalletSchema = z.object({
	id: backupId,
	name: z.string().min(1).max(50),
	kind: z.enum(['digital', 'cash']),
	created_at: backupTs
});

const BackupTransactionSchema = z.object({
	id: backupId,
	wallet_id: backupId,
	to_wallet_id: backupId.nullable(),
	description: z.string().min(1),
	amount: backupAmount,
	category: z.string().min(1),
	type: z.enum(['income', 'expense', 'transfer']),
	date: backupDate,
	created_at: backupTs,
	updated_at: backupTs
});

const BackupDebtSchema = z.object({
	id: backupId,
	person: z.string().min(1),
	direction: z.enum(['owe', 'owed']),
	amount: backupAmount,
	paid: z.number().min(0),
	wallet_id: backupId.nullable(),
	date: backupDate,
	created_at: backupTs,
	updated_at: backupTs
});

const BackupDebtPaymentSchema = z.object({
	id: backupId,
	debt_id: backupId,
	amount: backupAmount,
	wallet_id: backupId,
	date: backupDate,
	created_at: backupTs
});

const BackupAiProviderSchema = z.object({
	id: backupId,
	name: z.string().min(1).max(50),
	baseUrl: z.string().url().max(300),
	apiKey: z.string().min(1).max(500),
	model: z.string().min(1),
	models: z.array(z.string().min(1)).min(1)
});

export const BackupSchema = z.object({
	version: z.literal(1, { errorMap: () => ({ message: 'Format backup tidak didukung' }) }),
	exportedAt: z.string().min(1),
	wallets: backupList(BackupWalletSchema),
	transactions: backupList(BackupTransactionSchema),
	debts: backupList(BackupDebtSchema),
	debt_payments: backupList(BackupDebtPaymentSchema),
	ai_providers: backupList(BackupAiProviderSchema),
	ai_active_provider: z.string()
});

export type BackupData = z.infer<typeof BackupSchema>;
