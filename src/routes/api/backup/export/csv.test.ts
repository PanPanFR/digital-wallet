import { describe, it, expect } from 'vitest';
import { toCsvField } from './+server';

describe('toCsvField', () => {
	it('leaves plain values unquoted', () => {
		expect(toCsvField('Nasi goreng')).toBe('Nasi goreng');
		expect(toCsvField(25000)).toBe('25000');
	});
	it('quotes values containing a comma', () => {
		expect(toCsvField('Gaji, bonus')).toBe('"Gaji, bonus"');
	});
	it('doubles embedded quotes', () => {
		expect(toCsvField('Kopi "spesial", susu')).toBe('"Kopi ""spesial"", susu"');
	});
	it('quotes values containing a newline', () => {
		expect(toCsvField('a\nb')).toBe('"a\nb"');
	});
	it('maps null to empty', () => {
		expect(toCsvField(null)).toBe('');
	});
});
