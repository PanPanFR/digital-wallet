/**
 * AI provider storage unit tests.
 *
 * Storage is JSON strings in `app_settings` (keys ai_providers /
 * ai_active_provider) via getSetting/setSetting:
 *  - get/save round-trip through a fake D1.
 *  - Corrupt / wrong-shaped stored JSON parses to [] (defensive).
 *  - resolveProviderConfig: override id wins, else active provider, else null.
 *  - toSummary never leaks apiKey.
 */

import { describe, it, expect } from 'vitest';
import {
	getProviders,
	saveProviders,
	getActiveProviderId,
	setActiveProviderId,
	resolveProviderConfig,
	parseProviders,
	toSummary,
	type AiProvider
} from './aiProviders';

function provider(id: string, over: Partial<AiProvider> = {}): AiProvider {
	return {
		id,
		name: `P${id}`,
		baseUrl: 'https://x.example/v1',
		apiKey: `key-${id}`,
		model: 'm1',
		models: ['m1', 'm2'],
		...over
	};
}

// The fake above ignores key/bind; build a proper recording fake for these tests.
function settingDb(initial: Record<string, string> = {}) {
	const rows = new Map(Object.entries(initial));
	const calls: { sql: string; binds: unknown[] }[] = [];
	const db = {
		prepare: (sql: string) => {
			const entry = { sql, binds: [] as unknown[] };
			calls.push(entry);
			const result = {
				first: async () => {
					// SELECT value FROM app_settings WHERE key = ?
					const key = entry.binds[0] as string;
					const value = rows.get(key);
					return value === undefined ? null : { value };
				},
				run: async () => {
					const key = entry.binds[0] as string;
					const value = entry.binds[1] as string;
					rows.set(key, value);
					return { meta: { changes: 1 } };
				},
				all: async () => ({ results: [] as unknown[] })
			};
			return { ...result, bind: (...b: unknown[]) => ((entry.binds = b), result) };
		}
	};
	return { db: db as unknown as D1Database, rows, calls };
}

describe('parseProviders', () => {
	it('returns [] on null / corrupt JSON', () => {
		expect(parseProviders(null)).toEqual([]);
		expect(parseProviders('not json {')).toEqual([]);
		expect(parseProviders('{"a":1}')).toEqual([]);
		expect(parseProviders('[{"id":1}]')).toEqual([]); // not an object with strings
	});

	it('keeps well-shaped providers', () => {
		const p = provider('a');
		const parsed = parseProviders(JSON.stringify([p]));
		expect(parsed).toEqual([p]);
	});
});

describe('getProviders / saveProviders', () => {
	it('round-trips providers through the settings store', async () => {
		const { db, rows } = settingDb();
		const list = [provider('a'), provider('b', { model: 'gpt', models: ['gpt', 'claude'] })];
		await saveProviders(db, list);
		expect(rows.has('ai_providers')).toBe(true);
		expect(await getProviders(db)).toEqual(list);
	});

	it('returns [] when the key is missing', async () => {
		const { db } = settingDb();
		expect(await getProviders(db)).toEqual([]);
	});
});

describe('getActiveProviderId / setActiveProviderId', () => {
	it('round-trips the active id', async () => {
		const { db } = settingDb();
		expect(await getActiveProviderId(db)).toBe('');
		await setActiveProviderId(db, 'a');
		expect(await getActiveProviderId(db)).toBe('a');
	});
});

describe('resolveProviderConfig', () => {
	const list = [provider('a'), provider('b', { model: 'gpt', models: ['gpt'] })];

	it('prefers the override id over the active provider', async () => {
		const { db } = settingDb({ ai_providers: JSON.stringify(list), ai_active_provider: 'a' });
		const r = await resolveProviderConfig(db, 'b');
		expect(r).not.toBeNull();
		expect(r!.provider.id).toBe('b');
		expect(r!.baseUrl).toBe('https://x.example/v1');
		expect(r!.apiKey).toBe('key-b');
		expect(r!.model).toBe('gpt');
	});

	it('falls back to the active provider when no override given', async () => {
		const { db } = settingDb({ ai_providers: JSON.stringify(list), ai_active_provider: 'a' });
		const r = await resolveProviderConfig(db);
		expect(r!.provider.id).toBe('a');
	});

	it('returns null when nothing is configured', async () => {
		const { db } = settingDb({});
		expect(await resolveProviderConfig(db, 'zzz')).toBeNull();
	});

	it('returns null when override and active both miss', async () => {
		const { db } = settingDb({ ai_providers: JSON.stringify(list), ai_active_provider: 'zzz' });
		expect(await resolveProviderConfig(db, 'missing')).toBeNull();
	});

	it('trims trailing slash on baseUrl', async () => {
		const { db } = settingDb({
			ai_providers: JSON.stringify([provider('a', { baseUrl: 'https://x.example/v1/' })]),
			ai_active_provider: 'a'
		});
		const r = await resolveProviderConfig(db);
		expect(r!.baseUrl).toBe('https://x.example/v1');
	});
});

describe('toSummary', () => {
	it('never leaks apiKey', () => {
		const s = toSummary(provider('a', { apiKey: 'supersecret' }));
		expect(s).not.toHaveProperty('apiKey');
		expect(JSON.stringify(s)).not.toContain('supersecret');
	});
});
