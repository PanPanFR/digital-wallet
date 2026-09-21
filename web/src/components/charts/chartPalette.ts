import { formatIDR } from '@shared/format';

export const CHART_PALETTE = [
	'var(--color-ctp-blue)',
	'var(--color-ctp-peach)',
	'var(--color-ctp-yellow)',
	'var(--color-ctp-lavender)',
	'var(--color-ctp-teal)',
	'var(--color-ctp-pink)',
	'var(--color-ctp-maroon)',
	'var(--color-ctp-red)'
];

const idrCompact = new Intl.NumberFormat('id-ID', {
	style: 'currency',
	currency: 'IDR',
	notation: 'compact',
	maximumFractionDigits: 1
});

export function compactIDR(value: unknown): string {
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? idrCompact.format(n) : '';
}

export function shortLabel(value: unknown, max = 15): string {
	const s = String(value ?? '');
	return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function monthShort(ym: string): string {
	try {
		return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(
			new Date(`${ym}-01T00:00:00`)
		);
	} catch {
		return ym;
	}
}

export function monthLong(ym: string): string {
	try {
		return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
			new Date(`${ym}-01T00:00:00`)
		);
	} catch {
		return ym;
	}
}
