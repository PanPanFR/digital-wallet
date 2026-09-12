/** Shared transaction categories — UI-only (form select + category filter). */
export const CATEGORIES = [
	'Makanan',
	'Transportasi',
	'Tagihan',
	'Hiburan',
	'Belanja',
	'Kesehatan',
	'Pendidikan',
	'Lainnya'
] as const;

/** Quick amount chips shared by the transaction and debt forms. */
export const AMOUNT_PRESETS: [number, string][] = [
	[10_000, '+10rb'],
	[25_000, '+25rb'],
	[50_000, '+50rb'],
	[100_000, '+100rb'],
	[500_000, '+500rb'],
	[1_000_000, '+1jt']
];
