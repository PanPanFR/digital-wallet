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
import { parseTransactions, reportAnswer } from '$lib/server/ai';

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
				{ description: 'Kopi', amount: 25000, category: 'Makanan', type: 'expense' },
				{ description: 'Gaji', amount: 5_000_000, category: 'Gaji', type: 'income' }
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('test-key', 'beli kopi 25rb');

		expect(out).toEqual([
			{ description: 'Kopi', amount: 25000, category: 'Makanan', type: 'expense' },
			{ description: 'Gaji', amount: 5_000_000, category: 'Gaji', type: 'income' }
		]);
	});

	it('sends the API key in the Authorization header to the Gemini/9router endpoint', async () => {
		nextResponder = () => geminiTextResponse('{"transactions":[]}');
		await parseTransactions('sk-test-1234', 'apa saja');

		expect(calls).toHaveLength(1);
		const headers = calls[0].init.headers as Record<string, string>;
		expect(headers['Authorization']).toBe('Bearer sk-test-1234');
	});

	it('posts JSON to {baseUrl}/chat/completions with a model field', async () => {
		nextResponder = () => geminiTextResponse('{"transactions":[]}');
		await parseTransactions('k', 'x');

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
				{ description: 'OK 1', amount: 100, category: 'A', type: 'expense' },
				{ description: 'missing amount', category: 'B', type: 'expense' },
				{ description: 'bad type', amount: 50, category: 'C', type: 'transfer' },
				null,
				'not an object',
				{ description: 'OK 2', amount: 200, category: 'D', type: 'income' }
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('k', 'mixed input');
		expect(out).toEqual([
			{ description: 'OK 1', amount: 100, category: 'A', type: 'expense' },
			{ description: 'OK 2', amount: 200, category: 'D', type: 'income' }
		]);
	});

	it('returns an empty array (does not throw) when no valid transactions are present', async () => {
		const json = JSON.stringify({
			transactions: [
				{ description: 'no amount' },
				{ description: 'bad type', amount: 1, type: 'transfer' },
				null,
				42
			]
		});
		nextResponder = () => geminiTextResponse(json);

		const out = await parseTransactions('k', 'nothing usable');
		expect(out).toEqual([]);
	});

	it('returns an empty array when Gemini returns an empty transaction list', async () => {
		nextResponder = () => geminiTextResponse('{"transactions":[]}');
		const out = await parseTransactions('k', 'kosong');
		expect(out).toEqual([]);
	});

	it('rejects with a friendly error on HTTP 429 (rate limit / quota)', async () => {
		nextResponder = () =>
			new Response(JSON.stringify({ error: 'quota exceeded' }), { status: 429 });

		await expect(parseTransactions('k', 'x')).rejects.toThrow(/quota|rate|limit|429/i);
	});

	it('rejects with a friendly error on HTTP 500 (server error)', async () => {
		nextResponder = () =>
			new Response(JSON.stringify({ error: 'internal' }), { status: 500 });

		await expect(parseTransactions('k', 'x')).rejects.toThrow(/server|try again|500/i);
	});

	it('handles OpenAI-shape responses as well (extractContent fallback)', async () => {
		const json = JSON.stringify({
			transactions: [{ description: 'X', amount: 10, category: 'C', type: 'expense' }]
		});
		nextResponder = () => openAITextResponse(json);

		const out = await parseTransactions('k', 'whatever');
		expect(out).toEqual([
			{ description: 'X', amount: 10, category: 'C', type: 'expense' }
		]);
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
