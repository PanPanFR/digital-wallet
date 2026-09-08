/**
 * AI module unit tests — Gemini parse + report.
 * Module under test: $lib/server/ai (NOT yet implemented).
 *
 * Behavior derived from old `src/lib/ai.ts`:
 *  - Endpoint: POST {baseUrl}/chat/completions (OpenAI-compatible shape, Gemini
 *    via 9router). Auth: `Authorization: Bearer <apiKey>`. Model: gemini-2.5-flash.
 *  - Response shape unwrapping via `extractContent`:
 *      choices[0].message.content  (OpenAI)
 *      choices[0].text              (some providers)
 *      candidates[0].content.parts[0].text  (Gemini raw)
 *      direct `content` string
 *  - parseTransactions returns normalized
 *      { description: string, amount: number, category: string, type: 'income'|'expense' }
 *    dropping malformed entries silently rather than throwing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildParsePrompt, parseTransactions, reportAnswer } from '$lib/server/ai';
import type { WalletRow } from '$lib/server/db';

const testWallets: WalletRow[] = [
	{ id: 'seed-digital', name: 'Dompet Digital', kind: 'digital', created_at: 'x' },
	{ id: 'seed-cash', name: 'Tunai', kind: 'cash', created_at: 'x' }
];

interface FetchCall {
	url: string;
	init: RequestInit;
}

let calls: FetchCall[] = [];
let nextResponder: (url: string, init: RequestInit) => Response | Promise<Response>;

beforeEach(() => {
	calls = [];
	nextResponder = () =>
		new Response(JSON.stringify({ error: 'no responder configured' }), { status: 500 });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			const u = typeof url === 'string' ? url : url.toString();
			calls.push({ url: u, init: init ?? {} });
			return nextResponder(u, init ?? {});
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

/** Build a Gemini-shaped response with the given text inside parts[0].text. */
function geminiTextResponse(text: string, status = 200): Response {
	const body = {
		candidates: [
			{
				content: {
					parts: [{ text }],
					role: 'model'
				},
				finishReason: 'STOP'
			}
		]
	};
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

/** Build an OpenAI-shape response (choices[0].message.content). */
function openAITextResponse(text: string, status = 200): Response {
	const body = {
		choices: [{ message: { role: 'assistant', content: text } }]
	};
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

describe('parseTransactions', () => {
	it('returns normalized transactions from a valid Gemini response', async () => {
		const json = JSON.stringify({
			transactions: [
				{
					walletId: 'seed-digital',
					description: 'Kopi',
					amount: 25000,
					category: 'Makanan',
					type: 'expense'
				},
				{
					walletId: 'seed-cash',
					description: 'Gaji',
					amount: 5_000_000,
					category: 'Gaji',
					type: 'income',
					date: '2026-09-01'
				}
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('test-key', 'beli kopi 25rb', testWallets);

		expect(out).toEqual([
			{
				walletId: 'seed-digital',
				description: 'Kopi',
				amount: 25000,
				category: 'Makanan',
				type: 'expense',
				date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
			},
			{
				walletId: 'seed-cash',
				description: 'Gaji',
				amount: 5_000_000,
				category: 'Gaji',
				type: 'income',
				date: '2026-09-01'
			}
		]);
	});

	it('sends the API key in the Authorization header to the Gemini/9router endpoint', async () => {
		nextResponder = () => geminiTextResponse('{"transactions":[]}');
		await parseTransactions('sk-test-1234', 'apa saja', testWallets);

		expect(calls).toHaveLength(1);
		const headers = calls[0].init.headers as Record<string, string>;
		expect(headers['Authorization']).toBe('Bearer sk-test-1234');
	});

	it('posts JSON to {baseUrl}/chat/completions with a model field', async () => {
		nextResponder = () => geminiTextResponse('{"transactions":[]}');
		await parseTransactions('k', 'x', testWallets);

		const { url, init } = calls[0];
		expect(url).toMatch(/\/chat\/completions$/);
		expect(init.method).toBe('POST');
		const body = JSON.parse(init.body as string);
		expect(typeof body.model).toBe('string');
		expect(Array.isArray(body.messages)).toBe(true);
		expect(body.messages.length).toBeGreaterThan(0);
	});

	it('drops malformed entries and keeps valid ones', async () => {
		const json = JSON.stringify({
			transactions: [
				{ walletId: 'seed-cash', description: 'OK 1', amount: 100, category: 'A', type: 'expense' },
				{ description: 'missing amount', category: 'B', type: 'expense' },
				{ walletId: 'seed-cash', description: 'bad type', amount: 50, category: 'C', type: 'transfer' },
				null,
				'not an object',
				{ walletId: 'seed-cash', description: 'OK 2', amount: 200, category: 'D', type: 'income' }
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('k', 'mixed input', testWallets);
		expect(out).toEqual([
			{ walletId: 'seed-cash', description: 'OK 1', amount: 100, category: 'A', type: 'expense', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
			{ walletId: 'seed-cash', description: 'OK 2', amount: 200, category: 'D', type: 'income', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }
		]);
	});

	it('returns an empty array (does not throw) when no valid transactions are present', async () => {
		const json = JSON.stringify({
			transactions: [
				{ walletId: 'seed-cash', description: 'no amount' },
				{ walletId: 'seed-cash', description: 'bad type', amount: 1, type: 'transfer' },
				null,
				42
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('k', 'nothing usable', testWallets);
		expect(out).toEqual([]);
	});

	it('returns an empty array when Gemini returns an empty transaction list', async () => {
		nextResponder = () => geminiTextResponse('{"transactions":[]}');
		const out = await parseTransactions('k', 'kosong', testWallets);
		expect(out).toEqual([]);
	});

	it('rejects with a friendly error on HTTP 429 (rate limit / quota)', async () => {
		nextResponder = () =>
			new Response(JSON.stringify({ error: 'quota exceeded' }), { status: 429 });

		await expect(parseTransactions('k', 'x', testWallets)).rejects.toThrow(/quota|rate|limit|429/i);
	});

	it('rejects with a friendly error on HTTP 500 (server error)', async () => {
		nextResponder = () =>
			new Response(JSON.stringify({ error: 'internal' }), { status: 500 });

		await expect(parseTransactions('k', 'x', testWallets)).rejects.toThrow(/server|try again|500/i);
	});

	it('handles OpenAI-shape responses as well (extractContent fallback)', async () => {
		const json = JSON.stringify({
			transactions: [{ walletId: 'seed-cash', description: 'X', amount: 10, category: 'C', type: 'expense' }]
		});
		nextResponder = () => openAITextResponse(json);

		const out = await parseTransactions('k', 'whatever', testWallets);
		expect(out).toEqual([
			{ walletId: 'seed-cash', description: 'X', amount: 10, category: 'C', type: 'expense', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }
		]);
	});

	it('keeps an AI-provided concrete date', async () => {
		const json = JSON.stringify({
			transactions: [
				{ walletId: 'seed-cash', description: 'Kopi kemarin', amount: 25000, type: 'expense', date: '2026-09-07' }
			]
		});
		nextResponder = () => geminiTextResponse(json);
		const out = await parseTransactions('k', 'beli kopi kemarin', testWallets);
		expect(out[0].date).toBe('2026-09-07');
	});

	it('falls back to today when AI returns a malformed date', async () => {
		const json = JSON.stringify({
			transactions: [
				{ walletId: 'seed-cash', description: 'X', amount: 10, type: 'expense', date: 'kemarin' }
			]
		});
		nextResponder = () => geminiTextResponse(json);
		const out = await parseTransactions('k', 'x', testWallets);
		expect(out).toHaveLength(1);
		expect(out[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(out[0].date).not.toBe('kemarin');
	});
});

describe('buildParsePrompt', () => {
	it('includes wallet names and ids in the prompt', () => {
		const prompt = buildParsePrompt(testWallets);
		expect(prompt).toContain('seed-digital');
		expect(prompt).toContain('Dompet Digital');
		expect(prompt).toContain('Tunai');
	});
	it('requires walletId in the JSON format instruction', () => {
		const prompt = buildParsePrompt(testWallets);
		expect(prompt).toContain('walletId');
	});
	it('instructs the model to emit a date and resolve relative words', () => {
		const prompt = buildParsePrompt(testWallets);
		expect(prompt).toContain('"date"');
		expect(prompt).toContain('YYYY-MM-DD');
		expect(prompt).toContain('kemarin');
	});
});

describe('parseTransactions (wallet-aware)', () => {
	it('normalizes AI-picked walletId when valid', async () => {
		const json = JSON.stringify({
			transactions: [
				{
					walletId: 'seed-digital',
					description: 'Kopi',
					amount: 25000,
					category: 'Makanan',
					type: 'expense'
				}
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('k', 'beli kopi', testWallets);
		expect(out[0].walletId).toBe('seed-digital');
	});

	it('passes unknown walletId through (parse endpoint rejects it)', async () => {
		const json = JSON.stringify({
			transactions: [
				{ walletId: 'nope', description: 'X', amount: 10, type: 'expense' },
				{ walletId: 'seed-cash', description: 'Y', amount: 20, type: 'expense' }
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('k', 'mixed', testWallets);
		expect(out).toHaveLength(2);
		expect(out[0].walletId).toBe('nope');
	});
});

describe('reportAnswer', () => {
	it('returns the text content from a Gemini response', async () => {
		nextResponder = () => geminiTextResponse('Bulan ini pengeluaran terbesar kamu adalah Makan.');

		const answer = await reportAnswer('k', 'pengeluaran terbesar?', '{"summary":{}}');
		expect(answer).toBe('Bulan ini pengeluaran terbesar kamu adalah Makan.');
	});

	it('sends a single request to /chat/completions with the question and summary in messages', async () => {
		nextResponder = () => geminiTextResponse('ok');

		await reportAnswer('k', 'berapa total?', '{"income":1000,"expense":500}');

		expect(calls).toHaveLength(1);
		const { init } = calls[0];
		const body = JSON.parse(init.body as string);
		const allText = body.messages.map((m: { content: string }) => m.content).join('\n');
		expect(allText).toContain('berapa total?');
		expect(allText).toContain('1000');
	});

	it('rejects with a friendly error on HTTP 429', async () => {
		nextResponder = () => new Response('{}', { status: 429 });
		await expect(reportAnswer('k', 'q', '{}')).rejects.toThrow(/quota|rate|limit|429/i);
	});

	it('rejects with a friendly error on HTTP 500', async () => {
		nextResponder = () => new Response('{}', { status: 500 });
		await expect(reportAnswer('k', 'q', '{}')).rejects.toThrow(/server|try again|500/i);
	});
});
