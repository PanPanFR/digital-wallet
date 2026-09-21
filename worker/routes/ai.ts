import { Hono } from 'hono';
import { z } from 'zod';
import { chatAnswer, getConfigFromEnv } from '../ai';
import { resolveProviderConfig } from '../aiProviders';
import {
	getCategoryTotals,
	getMonthlySummary,
	getMonthlyTotals,
	getWalletBalances,
	listOpenDebts,
	listTransactions
} from '../db';
import { ChatSchema } from '../../shared/validation';
import type { Env } from '../env';

export const aiRoute = new Hono<{ Bindings: Env }>();
export const aiRoutes = aiRoute;

// Permissive input schema to handle both `{ messages: [...] }` and legacy `{ question, history }`
const FlexibleAiSchema = z.union([
	ChatSchema,
	z.object({
		question: z.string().trim().min(1).max(500),
		providerId: z.string().trim().optional(),
		model: z.string().trim().optional(),
		history: z
			.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
			.max(8)
			.default([])
	}).transform((d) => ({
		messages: [...d.history, { role: 'user' as const, content: d.question }],
		providerId: d.providerId,
		model: d.model
	}))
]);

aiRoutes.post('/report', async (c) => {
	const body = await c.req.json().catch(() => ({}));
	const parsed = FlexibleAiSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Pertanyaan tidak boleh kosong (maks. 500 karakter)' }, 400);
	}

	const { messages, providerId, model: modelOverride } = parsed.data;
	const db = c.env.DB;

	// Stored provider (body override → active) wins; fall back to env config.
	const resolved = await resolveProviderConfig(db, providerId);
	const envApiKey = c.env.GOOGLE_API_KEY;

	const cfg = resolved
		? {
				baseUrl: resolved.baseUrl,
				apiKey: resolved.apiKey,
				model:
					modelOverride && resolved.provider.models.includes(modelOverride)
						? modelOverride
						: resolved.model
			}
		: envApiKey
			? getConfigFromEnv(envApiKey)
			: null;

	if (!cfg) {
		return c.json({ error: 'Fitur AI belum dikonfigurasi' }, 503);
	}

	const now = new Date();
	const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const lastMonth = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;

	const [wallets, summaryThis, summaryLast, categories, trend6, openDebts, recent] =
		await Promise.all([
			getWalletBalances(db),
			getMonthlySummary(db, thisMonth),
			getMonthlySummary(db, lastMonth),
			getCategoryTotals(db, thisMonth),
			getMonthlyTotals(db, 6),
			listOpenDebts(db),
			listTransactions(db, { limit: 10 })
		]);

	const contextJson = JSON.stringify({
		thisMonth,
		lastMonth,
		wallets,
		summaryThisMonth: summaryThis,
		summaryLastMonth: summaryLast,
		categories,
		trend6Months: trend6,
		openDebts,
		recent
	});

	const lastMessage = messages[messages.length - 1];
	const question = lastMessage.content;
	const history = messages.slice(0, messages.length - 1);

	try {
		const answer = await chatAnswer(cfg, question, history, contextJson);
		return c.json({ answer });
	} catch (e) {
		return c.json(
			{ error: e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses AI' },
			502
		);
	}
});

export default aiRoutes;
