/**
 * AI module unit tests — chatAnswer (RAG snapshot chat).
 *
 * chatAnswer:
 *  - Endpoint: POST {baseUrl}/chat/completions (OpenAI-compatible shape, Gemini
 *    via 9router). Auth: `Authorization: Bearer <apiKey>`.
 *  - Config is passed explicitly (AiConfig from stored provider or env) —
 *    baseUrl/model come from cfg, not global env.
 *  - Messages: [system (IDR + plain-text rules), user (WIB time + context JSON
 *    + optional history transcript + last question)].
 *  - Response text unwrapped via `extractContent`, trimmed.
 *  - Friendly errors on 429 / 5xx.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatAnswer } from '$lib/server/ai';

interface FetchCall {
	url: string;
	init: RequestInit;
}

let calls: FetchCall[] = [];
let nextResponder: (url: string, init: RequestInit) => Response | Promise<Response>;

const CFG = { baseUrl: 'https://cfg.example.com/v1', apiKey: 'cfg-key', model: 'cfg-model' };

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

describe('chatAnswer', () => {
	it('returns the text content from a Gemini response', async () => {
		nextResponder = () => geminiTextResponse('Pengeluaran hari ini Rp25.000.');

		const answer = await chatAnswer(CFG, 'berapakah pengeluaran hari ini?', [], '{"summary":{}}');
		expect(answer).toBe('Pengeluaran hari ini Rp25.000.');
	});

	it('sends system + user messages with history, context JSON and the question', async () => {
		nextResponder = () => geminiTextResponse('ok');

		await chatAnswer(
			CFG,
			'terus bulan lalu gimana?',
			[
				{ role: 'user', content: 'berapakah' },
				{ role: 'assistant', content: 'jawab' }
			],
			'{"x":1}'
		);

		expect(calls).toHaveLength(1);
		const { init } = calls[0];
		const body = JSON.parse(init.body as string);
		const msgs = body.messages;
		expect(msgs).toHaveLength(2);
		expect(msgs[0].role).toBe('system');
		// IDR format + plain-text (no markdown bullets) instruction.
		expect(msgs[0].content).toContain('Rupiah');
		expect(msgs[0].content).toContain('plain text');
		// User message carries history transcript, context JSON, last question.
		const user = msgs[1].content;
		expect(user).toContain('User: berapakah');
		expect(user).toContain('Asisten: jawab');
		expect(user).toContain('{"x":1}');
		expect(user).toContain('Pertanyaan terakhir: "terus bulan lalu gimana?"');
	});

	it('omits the conversation block and uses 1024 max_tokens when history is empty', async () => {
		nextResponder = () => geminiTextResponse('ok');

		await chatAnswer(CFG, 'satu', [], '{"x":1}');

		const body = JSON.parse(calls[0].init.body as string);
		expect(body.messages[1].content).not.toContain('Percakapan sebelumnya');
		expect(body.max_tokens).toBe(1024);
	});

	it('hits the cfg baseUrl with the cfg model and apiKey in the payload/headers', async () => {
		nextResponder = () => geminiTextResponse('ok');

		await chatAnswer(CFG, 'q', [], '{}');

		const { url, init } = calls[0];
		expect(url).toBe('https://cfg.example.com/v1/chat/completions');
		const headers = init.headers as Record<string, string>;
		expect(headers.Authorization).toBe('Bearer cfg-key');
		const body = JSON.parse(init.body as string);
		expect(body.model).toBe('cfg-model');
	});

	it('rejects with a friendly error on HTTP 429', async () => {
		nextResponder = () => new Response('{}', { status: 429 });
		await expect(chatAnswer(CFG, 'q', [], '{}')).rejects.toThrow(/quota|rate|limit|429/i);
	});

	it('rejects with a friendly error on HTTP 500', async () => {
		nextResponder = () => new Response('{}', { status: 500 });
		await expect(chatAnswer(CFG, 'q', [], '{}')).rejects.toThrow(/server|try again|500/i);
	});
});
