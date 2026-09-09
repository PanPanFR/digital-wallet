/**
 * AI server module: answer free-form financial questions (chatbox).
 *
 * Context = structured snapshot from the DB injected per request
 * (RAG pattern 1). No parser, no server-side chat session — history
 * is supplied by the caller.
 *
 * Uses an OpenAI-compatible chat completions endpoint (default 9router).
 * Auth: Bearer token. Falls back to reading GOOGLE_API_KEY for
 * backwards compatibility.
 */

const DEFAULT_BASE_URL = 'https://9router.panpan.my.id/v1';
const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface AiConfig {
	baseUrl: string;
	apiKey: string;
	model: string;
}

/** Env-backed config (GOOGLE_API_KEY / AI_BASE_URL / AI_MODEL) with defaults. */
export function getConfigFromEnv(apiKey: string): AiConfig {
	return {
		baseUrl: (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
		apiKey,
		model: process.env.AI_MODEL || DEFAULT_MODEL
	};
}

/** POST a chat completion. Returns the raw fetch Response. */
async function callChatCompletion(
	cfg: AiConfig,
	messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
	opts: { temperature?: number; max_tokens?: number } = {}
): Promise<Response> {
	return fetch(`${cfg.baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${cfg.apiKey}`
		},
		body: JSON.stringify({
			model: cfg.model,
			messages,
			temperature: opts.temperature ?? 0.2,
			max_tokens: opts.max_tokens ?? 512,
			stream: false
		})
	});
}

/** Extract the assistant text from an OpenAI- or Gemini-shaped response. */
function extractContent(data: unknown): string | null {
	if (!data || typeof data !== 'object') return null;
	const d = data as Record<string, unknown>;

	// OpenAI: choices[0].message.content
	const choices = d.choices;
	if (Array.isArray(choices) && choices[0]) {
		const c0 = choices[0] as Record<string, unknown>;
		const msg = c0.message as Record<string, unknown> | undefined;
		if (msg && typeof msg.content === 'string') return msg.content;
		if (typeof c0.text === 'string') return c0.text;
	}

	// Gemini: candidates[0].content.parts[0].text
	const candidates = d.candidates;
	if (Array.isArray(candidates) && candidates[0]) {
		const cand = candidates[0] as Record<string, unknown>;
		const content = cand.content as Record<string, unknown> | undefined;
		const parts = content?.parts;
		if (Array.isArray(parts) && parts[0]) {
			const p0 = parts[0] as Record<string, unknown>;
			if (typeof p0.text === 'string') return p0.text;
		}
	}

	if (typeof d.content === 'string') return d.content;
	return null;
}

function mapStatusToFriendlyError(status: number, bodyText: string): Error {
	if (status === 429) {
		return new Error(`AI rate limit exceeded (429). Coba lagi sebentar. (${bodyText.slice(0, 120)})`);
	}
	if (status >= 500) {
		return new Error(`AI server error (${status}). Silakan coba lagi. (${bodyText.slice(0, 120)})`);
	}
	return new Error(`AI request failed (${status}): ${bodyText.slice(0, 200)}`);
}

// ponytail: snapshot context (RAG pattern 1). Fits ~10k transactions; upgrade
// to tool calling when the dataset grows.
/**
 * Answer a free-form question using a JSON snapshot of the user's finances
 * (built per request by the caller) plus optional chat history. Read-only:
 * never writes to the DB. Returns the assistant's plain-text Indonesian
 * reply. Throws with a friendly message on rate-limit / server errors.
 */
export async function chatAnswer(
	cfg: AiConfig,
	question: string,
	history: { role: 'user' | 'assistant'; content: string }[],
	contextJson: string
): Promise<string> {

	const systemPrompt = `Kamu adalah asisten keuangan pribadi untuk pengguna Indonesia. Jawab PERTANYAAN pengguna HANYA berdasarkan data konteks yang diberikan. Jangan mengarang angka. Kalau data tidak ada / tidak relevan, katakan "Tidak ada data..." lalu berhenti. Gunakan format Rupiah (Rp1.250.000). Jawab dalam bahasa Indonesia, plain text tanpa bullet/markdown, ringkas dan terstruktur.`;

	const userPrompt = `Waktu sekarang (WIB): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}

Data keuangan pengguna (JSON):
${contextJson}

${history.length ? `Percakapan sebelumnya:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}`).join('\n')}\n\n` : ''}Pertanyaan terakhir: "${question}"

Jawab dalam bahasa Indonesia.`;

	const res = await callChatCompletion(
		cfg,
		[
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		],
		{ max_tokens: 1024 }
	);

	if (!res.ok) {
		const bodyText = await res.text().catch(() => '');
		throw mapStatusToFriendlyError(res.status, bodyText);
	}

	const data = (await res.json()) as unknown;
	const text = extractContent(data);
	return (text ?? '').trim();
}
