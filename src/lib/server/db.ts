/**
 * D1 database access for Digital Wallet.
 * All functions take a D1Database as the first arg; callers in SvelteKit
 * load functions / actions pass `locals.platform.env.DB`.
 */

export interface WalletRow {
	id: string;
	name: string;
	kind: 'digital' | 'cash';
	created_at: string;
}

export interface WalletWithBalance extends WalletRow {
	balance: number;
}

export interface KindTotals {
	digital: number;
	cash: number;
	total: number;
}

export interface TxRow {
	id: string;
	wallet_id: string;
	to_wallet_id: string | null;
	wallet_name: string;
	wallet_kind: 'digital' | 'cash';
	dest_wallet_name: string | null;
	description: string;
	amount: number;
	category: string;
	type: 'income' | 'expense' | 'transfer';
	date: string;
	created_at: string;
	updated_at: string;
}

export type TxInput = Pick<TxRow, 'wallet_id' | 'description' | 'amount' | 'category' | 'type'> &
	Partial<Pick<TxRow, 'created_at' | 'date' | 'to_wallet_id'>>;

export interface MonthlySummary {
	month: string;
	income: number;
	expense: number;
	net: number;
}

export interface CategoryTotal {
	category: string;
	type: 'income' | 'expense';
	total: number;
}

export interface MonthlyTotal {
	month: string;
	income: number;
	expense: number;
}

export interface WalletTotal {
	id: string;
	name: string;
	kind: 'digital' | 'cash';
	total: number;
}

/** List wallets, grouped by kind then name. */
export async function listWallets(db: D1Database): Promise<WalletRow[]> {
	const { results } = await db.prepare('SELECT * FROM wallets ORDER BY kind, name').all<WalletRow>();
	return results ?? [];
}

/** Create a wallet, returns the new id. */
export async function createWallet(
	db: D1Database,
	w: { name: string; kind: 'digital' | 'cash' }
): Promise<string> {
	const id = crypto.randomUUID().replace(/-/g, '');
	await db.prepare('INSERT INTO wallets (id, name, kind) VALUES (?, ?, ?)').bind(id, w.name, w.kind).run();
	return id;
}

/** Update wallet name/kind. Returns true if a row was changed. */
export async function updateWallet(
	db: D1Database,
	id: string,
	w: Partial<{ name: string; kind: 'digital' | 'cash' }>
): Promise<boolean> {
	const fields: string[] = [];
	const values: unknown[] = [];
	if (w.name !== undefined) {
		fields.push('name = ?');
		values.push(w.name);
	}
	if (w.kind !== undefined) {
		fields.push('kind = ?');
		values.push(w.kind);
	}
	if (fields.length === 0) return false;
	values.push(id);
	const r = await db
		.prepare(`UPDATE wallets SET ${fields.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();
	return (r.meta?.changes ?? 0) > 0;
}

/** Delete a wallet. Refuses if it still has transactions. */
export async function deleteWallet(
	db: D1Database,
	id: string
): Promise<'deleted' | 'has-transactions' | 'not-found'> {
	const usage = await db
		.prepare('SELECT COUNT(*) AS n FROM transactions WHERE wallet_id = ? OR to_wallet_id = ?')
		.bind(id, id)
		.first<{ n: number }>();
	if ((usage?.n ?? 0) > 0) return 'has-transactions';
	const r = await db.prepare('DELETE FROM wallets WHERE id = ?').bind(id).run();
	return (r.meta?.changes ?? 0) > 0 ? 'deleted' : 'not-found';
}

// Transfer moves money between wallets: source -, destination +. A transfer row
// joins both wallets, so the CASE must key off which side this row is on.
const BALANCE_CASE = `COALESCE(SUM(CASE
	 WHEN t.type = 'income' THEN t.amount
	 WHEN t.type = 'expense' THEN -t.amount
	 WHEN t.type = 'transfer' AND t.wallet_id = w.id THEN -t.amount
	 WHEN t.type = 'transfer' AND t.to_wallet_id = w.id THEN t.amount
	 ELSE 0 END), 0)`;

const BALANCE_SQL =
	`SELECT w.id, w.name, w.kind, w.created_at,
	        ${BALANCE_CASE} AS balance
	 FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id OR t.to_wallet_id = w.id
	 GROUP BY w.id ORDER BY w.kind, w.name`;

/** Per-wallet balances, always computed from transactions (never stored). */
export async function getWalletBalances(db: D1Database): Promise<WalletWithBalance[]> {
	const { results } = await db.prepare(BALANCE_SQL).all<WalletWithBalance>();
	return (results ?? []).map((r) => ({ ...r, balance: Number(r.balance) || 0 }));
}

/** Combined balance per wallet kind + grand total. */
export async function getKindTotals(db: D1Database): Promise<KindTotals> {
	const { results } = await db
		.prepare(
			`SELECT w.kind, ${BALANCE_CASE} AS balance
			 FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id OR t.to_wallet_id = w.id
			 GROUP BY w.kind`
		)
		.all<{ kind: 'digital' | 'cash'; balance: number }>();
	const out: KindTotals = { digital: 0, cash: 0, total: 0 };
	for (const r of results ?? []) {
		const v = Number(r.balance) || 0;
		if (r.kind === 'digital') out.digital += v;
		else out.cash += v;
	}
	out.total = out.digital + out.cash;
	return out;
}

/** List transactions, newest first, joined with wallet info. Optional filters. */
export async function listTransactions(
	db: D1Database,
	opts: {
		limit?: number;
		offset?: number;
		month?: string;
		walletId?: string;
		search?: string;
		category?: string;
	} = {}
): Promise<TxRow[]> {
	const { limit = 100, offset = 0, month, walletId, search, category } = opts;
	const where: string[] = [];
	const binds: unknown[] = [];

	if (month) {
		where.push('t.date LIKE ?');
		binds.push(`${month}%`);
	}
	if (walletId) {
		where.push('t.wallet_id = ?');
		binds.push(walletId);
	}
	if (search) {
		where.push('t.description LIKE ?');
		binds.push(`%${search}%`);
	}
	if (category) {
		where.push('t.category = ?');
		binds.push(category);
	}

	const sql =
		`SELECT t.*, w.name AS wallet_name, w.kind AS wallet_kind, w2.name AS dest_wallet_name
		 FROM transactions t JOIN wallets w ON w.id = t.wallet_id
		 LEFT JOIN wallets w2 ON w2.id = t.to_wallet_id` +
		(where.length ? ` WHERE ${where.join(' AND ')}` : '') +
		` ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
	binds.push(limit, offset);

	const { results } = await db.prepare(sql).bind(...binds).all<TxRow>();
	return results ?? [];
}

/** Fetch a single transaction by id (with wallet info). Returns null if not found. */
export async function getTransaction(db: D1Database, id: string): Promise<TxRow | null> {
	const row = await db
		.prepare(
			`SELECT t.*, w.name AS wallet_name, w.kind AS wallet_kind, w2.name AS dest_wallet_name
			 FROM transactions t JOIN wallets w ON w.id = t.wallet_id
			 LEFT JOIN wallets w2 ON w2.id = t.to_wallet_id
			 WHERE t.id = ?`
		)
		.bind(id)
		.first<TxRow>();
	return row ?? null;
}

/** Insert a single transaction, returns the created row id. */
export async function createTransaction(db: D1Database, tx: TxInput): Promise<string> {
	const id = crypto.randomUUID().replace(/-/g, '');
	const createdAt = tx.created_at || new Date().toISOString();
	const date = tx.date || new Date().toISOString().slice(0, 10);
	const toWalletId = tx.type === 'transfer' ? (tx.to_wallet_id ?? null) : null;
	await db
		.prepare(
			`INSERT INTO transactions (id, wallet_id, to_wallet_id, description, amount, category, type, date, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(id, tx.wallet_id, toWalletId, tx.description, tx.amount, tx.category || 'Lainnya', tx.type, date, createdAt)
		.run();
	return id;
}

/** Batch insert multiple transactions. Returns count inserted. */
export async function createTransactions(db: D1Database, items: TxInput[]): Promise<number> {
	if (items.length === 0) return 0;
	const stmts = items.map((tx) => {
		const id = crypto.randomUUID().replace(/-/g, '');
		const createdAt = tx.created_at || new Date().toISOString();
		const date = tx.date || new Date().toISOString().slice(0, 10);
		const toWalletId = tx.type === 'transfer' ? (tx.to_wallet_id ?? null) : null;
		return db
			.prepare(
				`INSERT INTO transactions (id, wallet_id, to_wallet_id, description, amount, category, type, date, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(id, tx.wallet_id, toWalletId, tx.description, tx.amount, tx.category || 'Lainnya', tx.type, date, createdAt);
	});
	await db.batch(stmts);
	return items.length;
}

/** Update a transaction by id. Returns true if a row was changed. */
export async function updateTransaction(
	db: D1Database,
	id: string,
	tx: Partial<Pick<TxRow, 'description' | 'amount' | 'category' | 'type' | 'wallet_id' | 'date' | 'to_wallet_id'>>
): Promise<boolean> {
	const fields: string[] = [];
	const values: unknown[] = [];

	if (tx.wallet_id !== undefined) {
		fields.push('wallet_id = ?');
		values.push(tx.wallet_id);
	}
	if (tx.to_wallet_id !== undefined) {
		fields.push('to_wallet_id = ?');
		values.push(tx.to_wallet_id);
	}
	if (tx.description !== undefined) {
		fields.push('description = ?');
		values.push(tx.description);
	}
	if (tx.amount !== undefined) {
		fields.push('amount = ?');
		values.push(tx.amount);
	}
	if (tx.category !== undefined) {
		fields.push('category = ?');
		values.push(tx.category);
	}
	if (tx.type !== undefined) {
		fields.push('type = ?');
		values.push(tx.type);
	}
	if (tx.date !== undefined) {
		fields.push('date = ?');
		values.push(tx.date);
	}

	if (fields.length === 0) return false;

	fields.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(id);

	const result = await db
		.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run();

	return (result.meta?.changes ?? 0) > 0;
}

/** Delete a transaction by id. Returns true if a row was deleted. */
export async function deleteTransaction(db: D1Database, id: string): Promise<boolean> {
	const result = await db.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run();
	return (result.meta?.changes ?? 0) > 0;
}

/** Aggregate income/expense/net for a single month (YYYY-MM). Transfers excluded. */
export async function getMonthlySummary(db: D1Database, month: string): Promise<MonthlySummary> {
	const { results } = await db
		.prepare(
			`SELECT type, COALESCE(SUM(amount), 0) AS total
			 FROM transactions
			 WHERE date LIKE ? AND type != 'transfer'
			 GROUP BY type`
		)
		.bind(`${month}%`)
		.all<{ type: 'income' | 'expense'; total: number }>();

	let income = 0;
	let expense = 0;
	for (const row of results ?? []) {
		if (row.type === 'income') income = Number(row.total) || 0;
		else expense = Number(row.total) || 0;
	}
	return { month, income, expense, net: income - expense };
}

/** Per-category totals for a single month (YYYY-MM). Transfers excluded. */
export async function getCategoryTotals(db: D1Database, month: string): Promise<CategoryTotal[]> {
	const { results } = await db
		.prepare(
			`SELECT category, type, COALESCE(SUM(amount), 0) AS total
			 FROM transactions
			 WHERE date LIKE ? AND type != 'transfer'
			 GROUP BY category, type
			 ORDER BY total DESC`
		)
		.bind(`${month}%`)
		.all<CategoryTotal>();
	return (results ?? []).map((r) => ({
		category: r.category || 'Lainnya',
		type: r.type,
		total: Number(r.total) || 0
	}));
}

/**
 * Totals for the last N months (inclusive of the current month).
 * Returns an array of length N, oldest first, with zero-filled months
 * for which there is no data.
 */
export async function getMonthlyTotals(db: D1Database, months: number): Promise<MonthlyTotal[]> {
	const cutoff = new Date();
	cutoff.setUTCDate(1);
	cutoff.setUTCMonth(cutoff.getUTCMonth() - (months - 1));
	const cutoffMonth = cutoff.toISOString().slice(0, 7);

	const { results } = await db
		.prepare(
			`SELECT substr(date, 1, 7) AS month, type, COALESCE(SUM(amount), 0) AS total
			 FROM transactions
			 WHERE date >= ? AND type != 'transfer'
			 GROUP BY month, type
			 ORDER BY month ASC`
		)
		.bind(`${cutoffMonth}-01`)
		.all<{ month: string; type: 'income' | 'expense'; total: number }>();

	const byMonth = new Map<string, MonthlyTotal>();
	for (const row of results ?? []) {
		const m = row.month;
		const cur = byMonth.get(m) ?? { month: m, income: 0, expense: 0 };
		if (row.type === 'income') cur.income = Number(row.total) || 0;
		else cur.expense = Number(row.total) || 0;
		byMonth.set(m, cur);
	}

	const out: MonthlyTotal[] = [];
	for (let i = 0; i < months; i++) {
		const d = new Date(cutoff);
		d.setUTCMonth(d.getUTCMonth() + i);
		const key = d.toISOString().slice(0, 7);
		out.push(byMonth.get(key) ?? { month: key, income: 0, expense: 0 });
	}
	return out;
}

/** Expense totals per wallet for a month (YYYY-MM). Transfers excluded (not spending). */
export async function getWalletTotals(db: D1Database, month: string): Promise<WalletTotal[]> {
	const { results } = await db
		.prepare(
			`SELECT w.id, w.name, w.kind,
			        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total
			 FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id AND t.date LIKE ?
			 GROUP BY w.id ORDER BY total DESC`
		)
		.bind(`${month}%`)
		.all<WalletTotal>();
	return (results ?? []).map((r) => ({
		id: r.id,
		name: r.name,
		kind: r.kind,
		total: Number(r.total) || 0
	}));
}

/** Get an app setting by key. */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
	const row = await db
		.prepare('SELECT value FROM app_settings WHERE key = ?')
		.bind(key)
		.first<{ value: string }>();
	return row?.value ?? null;
}

/** Set or update an app setting. */
export async function setSetting(db: D1Database, key: string, value: string): Promise<boolean> {
	const result = await db
		.prepare(
			`INSERT INTO app_settings (key, value, updated_at)
			 VALUES (?, ?, ?)
			 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
		)
		.bind(key, value, new Date().toISOString())
		.run();
	return (result.meta?.changes ?? 0) > 0;
}

/**
 * D1-backed sliding-window rate limiter. Returns true if the request is
 * allowed (count ≤ max after increment), false if rate-limited.
 * Best-effort: if the DB write fails, fails open.
 */
export async function hitRateLimit(
	db: D1Database,
	key: string,
	windowMs: number,
	max: number
): Promise<boolean> {
	try {
		const now = Date.now();
		const windowStart = now - windowMs;
		const result = await db
			.prepare(
				`INSERT INTO rate_limits (key, window_start, count)
				 VALUES (?, ?, 1)
				 ON CONFLICT(key) DO UPDATE SET
				   count = CASE WHEN rate_limits.window_start < ? THEN 1 ELSE rate_limits.count + 1 END,
				   window_start = CASE WHEN rate_limits.window_start < ? THEN excluded.window_start ELSE rate_limits.window_start END
				 RETURNING count`
			)
			.bind(key, now, windowStart, windowStart)
			.first<{ count: number }>();
		return (result?.count ?? 0) <= max;
	} catch {
		return true;
	}
}

// ---------- Debts ----------

export interface DebtRow {
	id: string;
	person: string;
	direction: 'owe' | 'owed';
	amount: number;
	paid: number;
	remaining: number;
	wallet_id: string | null;
	wallet_name: string | null;
	date: string;
	created_at: string;
	updated_at: string;
}

export interface DebtPaymentRow {
	id: string;
	debt_id: string;
	amount: number;
	wallet_id: string;
	wallet_name: string;
	date: string;
}

const DEBT_SELECT = `SELECT d.*, w.name AS wallet_name, (d.amount - d.paid) AS remaining
	FROM debts d LEFT JOIN wallets w ON w.id = d.wallet_id`;

function mapDebt(r: Record<string, unknown>): DebtRow {
	return {
		...(r as unknown as DebtRow),
		amount: Number(r.amount) || 0,
		paid: Number(r.paid) || 0,
		remaining: Number(r.remaining) || 0
	};
}

/** List all debts (open + paid off), newest first. */
export async function listDebts(db: D1Database): Promise<DebtRow[]> {
	const { results } = await db
		.prepare(`${DEBT_SELECT} ORDER BY d.date DESC, d.created_at DESC`)
		.all<Record<string, unknown>>();
	return (results ?? []).map(mapDebt);
}

/** Open debts only (paid < amount). Used by AI chatbox next plan — keep name. */
export async function listOpenDebts(db: D1Database): Promise<DebtRow[]> {
	const { results } = await db
		.prepare(`${DEBT_SELECT} WHERE d.amount > d.paid ORDER BY d.date DESC, d.created_at DESC`)
		.all<Record<string, unknown>>();
	return (results ?? []).map(mapDebt);
}

/** Fetch a single debt by id, or null. */
export async function getDebt(db: D1Database, id: string): Promise<DebtRow | null> {
	const row = await db
		.prepare(`${DEBT_SELECT} WHERE d.id = ?`)
		.bind(id)
		.first<Record<string, unknown>>();
	return row ? mapDebt(row) : null;
}

/**
 * Create a debt. With reduceBalance, the record is created already fully paid
 * and a single atomic batch also drops a debt_payments row + the matching
 * transaction. This keeps the invariant paid == SUM(debt_payments) on every path.
 */
export async function createDebt(
	db: D1Database,
	input: {
		person: string;
		direction: 'owe' | 'owed';
		amount: number;
		date: string;
		walletId: string | null;
		reduceBalance: boolean;
	}
): Promise<string> {
	const id = crypto.randomUUID().replace(/-/g, '');
	const debtStmt = db
		.prepare(
			'INSERT INTO debts (id, person, direction, amount, paid, wallet_id, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(id, input.person, input.direction, input.amount, input.reduceBalance ? input.amount : 0, input.walletId, input.date);

	if (!input.reduceBalance) {
		await debtStmt.run();
		return id;
	}

	// ponytail: reduceBalance = record + full payment in one path; 1 payment row per
	// catat so paid always equals SUM(debt_payments). No separate code path.
	const walletId = input.walletId as string;
	const txType = input.direction === 'owe' ? 'expense' : 'income';
	const desc =
		input.direction === 'owe'
			? `Pinjam dari ${input.person}`
			: `Pinjamkan ke ${input.person}`;
	const payId = crypto.randomUUID().replace(/-/g, '');
	const txId = crypto.randomUUID().replace(/-/g, '');
	await db.batch([
		debtStmt,
		db
			.prepare('INSERT INTO debt_payments (id, debt_id, amount, wallet_id, date) VALUES (?, ?, ?, ?, ?)')
			.bind(payId, id, input.amount, walletId, input.date),
		db
			.prepare(
				'INSERT INTO transactions (id, wallet_id, to_wallet_id, description, amount, category, type, date, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)'
			)
			.bind(txId, walletId, desc, input.amount, 'Lainnya', txType, input.date, new Date().toISOString())
	]);
	return id;
}

/**
 * Record a partial/full payment. Returns 'not-found' / 'overpay' on guard
 * failure, otherwise { id }. Always atomic via db.batch: payment row, matching
 * transaction, and debts.paid increment.
 */
export async function addDebtPayment(
	db: D1Database,
	input: { debtId: string; amount: number; walletId: string; date: string }
): Promise<'overpay' | 'not-found' | { id: string }> {
	const debt = await getDebt(db, input.debtId);
	if (!debt) return 'not-found';
	if (input.amount > debt.remaining) return 'overpay';

	const payId = crypto.randomUUID().replace(/-/g, '');
	const txId = crypto.randomUUID().replace(/-/g, '');
	const type = debt.direction === 'owe' ? 'expense' : 'income';
	const desc =
		debt.direction === 'owe'
			? `Bayar utang ke ${debt.person}`
			: `Terima bayaran dari ${debt.person}`;
	await db.batch([
		db
			.prepare('INSERT INTO debt_payments (id, debt_id, amount, wallet_id, date) VALUES (?, ?, ?, ?, ?)')
			.bind(payId, debt.id, input.amount, input.walletId, input.date),
		db
			.prepare(
				'INSERT INTO transactions (id, wallet_id, to_wallet_id, description, amount, category, type, date, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)'
			)
			.bind(txId, input.walletId, desc, input.amount, 'Lainnya', type, input.date, new Date().toISOString()),
		db
			.prepare("UPDATE debts SET paid = paid + ?, updated_at = datetime('now') WHERE id = ?")
			.bind(input.amount, debt.id)
	]);
	return { id: debt.id };
}

/** Delete a debt. Refuses ('has-payments') if any payment exists. */
export async function deleteDebt(
	db: D1Database,
	id: string
): Promise<'deleted' | 'has-payments' | 'not-found'> {
	const usage = await db
		.prepare('SELECT COUNT(*) AS n FROM debt_payments WHERE debt_id = ?')
		.bind(id)
		.first<{ n: number }>();
	if ((usage?.n ?? 0) > 0) return 'has-payments';
	const r = await db.prepare('DELETE FROM debts WHERE id = ?').bind(id).run();
	return (r.meta?.changes ?? 0) > 0 ? 'deleted' : 'not-found';
}

/** Sum of remaining per direction across open debts. */
export async function getDebtDirectionTotals(db: D1Database): Promise<{ owe: number; owed: number }> {
	const open = await listOpenDebts(db);
	const totals = { owe: 0, owed: 0 };
	for (const d of open) totals[d.direction] += d.remaining;
	return totals;
}
