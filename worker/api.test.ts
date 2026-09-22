import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from './index';
import { createSessionToken, hashPassword, sessionCookieName } from './auth';

const TEST_SECRET = 'test-secret-for-api-tests-min-32-chars-long';

function makeDb(handler?: (sql: string, binds: unknown[]) => unknown) {
	return {
		prepare: (sql: string) => {
			let boundArgs: unknown[] = [];
			const makeRes = () => {
				const val = handler ? handler(sql, boundArgs) : [];
				const rows = Array.isArray(val) ? val : [];
				return {
					all: async () => ({ results: rows }),
					first: async () => (Array.isArray(val) ? val[0] ?? null : val ?? null),
					run: async () => ({ meta: { changes: 1 } })
				};
			};
			return {
				...makeRes(),
				bind: (...args: unknown[]) => {
					boundArgs = args;
					return makeRes();
				}
			};
		},
		batch: async (stmts: unknown[]) => stmts.map(() => ({ meta: { changes: 1 } }))
	} as unknown as D1Database;
}

describe('Worker Hono API Contract', () => {
	let validCookie: string;

	beforeAll(async () => {
		process.env.SESSION_SECRET = TEST_SECRET;
		const token = await createSessionToken('any', TEST_SECRET);
		validCookie = `${sessionCookieName}=${token}`;
	});

	afterAll(() => {
		delete process.env.SESSION_SECRET;
	});

	describe('Authentication Guard', () => {
		it('returns 401 JSON on unauthenticated protected endpoints', async () => {
			const res = await app.request('/api/wallets', { method: 'GET' }, {
				DB: makeDb(),
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(401);
			const json = await res.json() as { error: string };
			expect(json.error).toBe('Unauthorized');
		});

		it('allows authenticated requests with valid session cookie', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('wallets')) {
					return [{ id: 'w1', name: 'Dompet Digital', kind: 'digital', balance: 50000, created_at: '2026-01-01' }];
				}
				return [];
			});

			const res = await app.request('/api/wallets', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const json = await res.json() as { wallets: unknown[] };
			expect(json.wallets).toHaveLength(1);
		});
	});

	describe('/api/auth/status', () => {
		it('is public and returns setupRequired and authenticated state', async () => {
			const db = makeDb(() => null); // no password hash
			const res = await app.request('/api/auth/status', { method: 'GET' }, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const json = await res.json() as { setupRequired: boolean; authenticated: boolean };
			expect(json.setupRequired).toBe(true);
			expect(json.authenticated).toBe(false);
		});
	});

	describe('/api/auth/setup', () => {
		it('sets password hash and returns Set-Cookie when setup is required', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('SELECT value FROM app_settings')) return null;
				return [];
			});
			const res = await app.request('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'masterpassword123' })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const cookieHeader = res.headers.get('set-cookie');
			expect(cookieHeader).toContain(sessionCookieName);
		});

		it('returns 403 if password already set', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('SELECT value FROM app_settings')) return { value: 'existing_hash' };
				return [];
			});
			const res = await app.request('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'masterpassword123' })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(403);
		});
	});

	describe('/api/auth/login', () => {
		it('verifies password and sets cookie on success', async () => {
			const hash = await hashPassword('correctpass123');
			const db = makeDb((sql) => {
				if (sql.includes('rate_limits')) return { count: 1 };
				if (sql.includes('SELECT value FROM app_settings')) return { value: hash };
				return [];
			});
			const res = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'correctpass123' })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('set-cookie')).toContain(sessionCookieName);
		});

		it('returns 429 when rate limit is exceeded', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('rate_limits')) return { count: 6 }; // exceeded 5
				return [];
			});
			const res = await app.request('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: 'somepassword123' })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(429);
		});
	});

	describe('/api/auth/logout', () => {
		it('clears cookie', async () => {
			const res = await app.request('/api/auth/logout', {
				method: 'POST'
			}, {
				DB: makeDb(),
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
		});
	});

	describe('/api/wallets guards', () => {
		it('returns 409 duplicate on wallet collision', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('COUNT(*) AS n FROM wallets')) return { n: 1 };
				return [];
			});
			const res = await app.request('/api/wallets', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: validCookie
				},
				body: JSON.stringify({ name: 'Tunai', kind: 'cash' })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(409);
		});

		it('returns 409 has-transactions when deleting wallet with transactions', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('COUNT(*) AS n FROM transactions')) return { n: 2 };
				return [];
			});
			const res = await app.request('/api/wallets/w1', {
				method: 'DELETE',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(409);
		});
	});

	describe('/api/transactions', () => {
		it('returns transactions list and handles kind filter correctly', async () => {
			let capturedSql = '';
			const db = makeDb((sql) => {
				capturedSql = sql;
				if (sql.includes('FROM transactions t')) {
					return [{ id: 't1', description: 'Makan', amount: 25000, wallet_kind: 'digital' }];
				}
				return [];
			});
			const res = await app.request('/api/transactions?wallet=digital', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const data = (await res.json()) as any;
			expect(data.transactions).toHaveLength(1);
			expect(capturedSql).toContain('w.kind = ?');
		});

		it('validates transaction creation payload', async () => {
			const db = makeDb(() => []);
			const res = await app.request('/api/transactions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: validCookie
				},
				body: JSON.stringify({ amount: -100 })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(400);
		});
	});

	describe('/api/debts guards', () => {
		it('returns 409 overpay when payment exceeds remaining debt', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('FROM debts d')) {
					return [{ id: 'd1', person: 'Budi', direction: 'owe', amount: 50000, paid: 40000, remaining: 10000 }];
				}
				return [];
			});
			const res = await app.request('/api/debts/d1/payments', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: validCookie
				},
				body: JSON.stringify({ amount: 20000, walletId: 'w1', date: '2026-01-01' })
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(409);
		});
	});

	describe('/api/dashboard', () => {
		it('returns composite dashboard payload in one round-trip', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('GROUP BY w.kind')) return [{ kind: 'digital', balance: 100000 }];
				if (sql.includes('type, COALESCE(SUM(amount)')) return [{ type: 'income', total: 50000 }];
				if (sql.includes('FROM wallets w')) return [{ id: 'w1', name: 'GoPay', kind: 'digital', balance: 100000 }];
				if (sql.includes('FROM transactions t')) return [];
				if (sql.includes('FROM debts d')) return [];
				return [];
			});

			const res = await app.request('/api/dashboard?month=2026-01', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const json = await res.json() as Record<string, unknown>;
			expect(json).toHaveProperty('kinds');
			expect(json).toHaveProperty('summary');
			expect(json).toHaveProperty('balances');
			expect(json).toHaveProperty('recent');
			expect(json).toHaveProperty('openDebts');
			expect(json).toHaveProperty('trend');
		});
	});

	describe('/api/ai/report', () => {
		it('returns 503 when no AI provider or API key is configured', async () => {
			const db = makeDb(() => null);
			const res = await app.request('/api/ai/report', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: validCookie
				},
				body: JSON.stringify({
					messages: [{ role: 'user', content: 'berapa pengeluaran bulan ini?' }]
				})
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(503);
		});
	});

	describe('/api/analytics', () => {
		it('returns composite analytics payload', async () => {
			const db = makeDb((sql) => {
				if (sql.includes('type, COALESCE(SUM(amount)')) return [{ type: 'expense', total: 75000 }];
				if (sql.includes('category, type, COALESCE(SUM(amount)')) return [{ category: 'Makan', type: 'expense', total: 50000 }];
				if (sql.includes('w.id, w.name, COALESCE(SUM(amount)')) return [{ id: 'w1', name: 'GoPay', total: 50000 }];
				if (sql.includes('strftime(')) return [{ month: '2026-01', income: 100000, expense: 75000 }];
				return [];
			});

			const res = await app.request('/api/analytics?month=2026-01', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const json = await res.json() as Record<string, unknown>;
			expect(json.month).toBe('2026-01');
			expect(json).toHaveProperty('summary');
			expect(json).toHaveProperty('categoryTotals');
			expect(json).toHaveProperty('walletTotals');
			expect(json).toHaveProperty('trend');
		});
	});

	describe('/api/settings/providers', () => {
		it('returns provider list and activeProviderId', async () => {
			const db = makeDb((sql, boundArgs) => {
				if (boundArgs.includes('ai_providers')) {
					return {
						value: JSON.stringify([
							{
								id: 'p1',
								name: 'TestAI',
								baseUrl: 'https://api.test.com/v1',
								apiKey: 'secretkey',
								model: 'model-a',
								models: ['model-a']
							}
						])
					};
				}
				if (boundArgs.includes('ai_active_provider')) {
					return { value: 'p1' };
				}
				return null;
			});

			const res = await app.request('/api/settings/providers', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			const json = await res.json() as { providers: any[]; activeProviderId: string };
			expect(json.providers).toHaveLength(1);
			expect(json.providers[0].name).toBe('TestAI');
			expect(json.providers[0].apiKey).toBeUndefined(); // stripped by toSummary
			expect(json.activeProviderId).toBe('p1');
		});
	});

	describe('/api/backup/import', () => {
		it('returns 400 when format is invalid', async () => {
			const res = await app.request('/api/backup/import', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: validCookie
				},
				body: JSON.stringify({ invalid: true })
			}, {
				DB: makeDb(),
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(400);
		});
	});

	describe('/api/backup/export & export.csv', () => {
		it('returns JSON backup on /export', async () => {
			const db = makeDb(() => []);
			const res = await app.request('/api/backup/export', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
		});

		it('returns CSV on /export.csv', async () => {
			const db = makeDb(() => []);
			const res = await app.request('/api/backup/export.csv', {
				method: 'GET',
				headers: { Cookie: validCookie }
			}, {
				DB: db,
				SESSION_SECRET: TEST_SECRET,
				ASSETS: {} as any
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('text/csv');
		});
	});
});
