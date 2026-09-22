/** Indonesian formatting helpers shared by transactions, dashboard. */
const idr = new Intl.NumberFormat('id-ID', {
	style: 'currency',
	currency: 'IDR',
	maximumFractionDigits: 0
});

const dateTime = new Intl.DateTimeFormat('id-ID', {
	timeZone: 'Asia/Jakarta',
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

export function formatIDR(amount: number): string {
	// Intl id-ID emits `Rp` + NBSP; DESIGN.md wants `Rp ` with a regular space.
	return idr.format(amount).replace(/ /g, ' ');
}

export function formatDate(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? '' : dateTime.format(d);
}

/** Today's calendar date (YYYY-MM-DD) in WIB. */
export function todayISO(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}
