export const CSV_COLUMNS = ['date', 'description', 'category', 'type', 'amount', 'wallet_id', 'to_wallet_id'] as const;

/** Quote a CSV field when it contains a comma, quote, or newline. */
// ponytail: single-route helper, extract to lib/ only if a second CSV consumer appears.
export function toCsvField(v: string | number | null): string {
	const s = v === null ? '' : String(v);
	return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
