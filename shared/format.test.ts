import { describe, it, expect } from 'vitest';
import { formatIDR, formatDate, todayISO } from './format';

describe('formatIDR', () => {
	it('formats positive amounts with regular space after Rp', () => {
		const formatted = formatIDR(50000);
		expect(formatted).toMatch(/^Rp\s50\.000$/);
	});

	it('formats zero correctly', () => {
		const formatted = formatIDR(0);
		expect(formatted).toMatch(/^Rp\s0$/);
	});
});

describe('formatDate', () => {
	it('formats valid ISO date into Indonesian short date', () => {
		const formatted = formatDate('2026-09-21');
		expect(formatted).toContain('2026');
		expect(formatted).toContain('21');
	});

	it('returns empty string for invalid date', () => {
		expect(formatDate('not-a-date')).toBe('');
	});
});

describe('todayISO', () => {
	it('returns date string in YYYY-MM-DD format', () => {
		const today = todayISO();
		expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
