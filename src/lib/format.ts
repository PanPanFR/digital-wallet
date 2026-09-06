/** Indonesian formatting helpers shared by transactions, dashboard, analytics. */
const idr = new Intl.NumberFormat('id-ID', {
	style: 'currency',
	currency: 'IDR',
	maximumFractionDigits: 0
});

const dateTime = new Intl.DateTimeFormat('id-ID', {
	timeZone: 'Asia/Jakarta',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});

export function formatIDR(amount: number): string {
	return idr.format(amount);
}

export function formatDate(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? '' : dateTime.format(d);
}
