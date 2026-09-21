import { Hono } from 'hono';
import { z } from 'zod';
import {
	getActiveProviderId,
	getProviders,
	saveProviders,
	setActiveProviderId,
	toSummary,
	type AiProvider
} from '../aiProviders';
import { hashPassword, verifyPassword } from '../auth';
import { getSetting, setSetting } from '../db';
import { issueSessionCookie } from '../session';
import { PasswordChangeSchema, ProviderSchema, fieldErrors } from '../../shared/validation';
import type { Env } from '../env';

export const settingsRoutes = new Hono<{ Bindings: Env }>();
export const settingsRoute = settingsRoutes;

// Providers
settingsRoutes.get('/providers', async (c) => {
	const db = c.env.DB;
	const [providers, activeProviderId] = await Promise.all([
		getProviders(db),
		getActiveProviderId(db)
	]);
	return c.json({
		providers: providers.map(toSummary),
		activeProviderId
	});
});

settingsRoutes.post('/providers', async (c) => {
	const db = c.env.DB;
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	const id = typeof body.id === 'string' ? body.id.trim() : '';

	const providers = await getProviders(db);
	const existing = id ? providers.find((p) => p.id === id) : undefined;

	const apiKeyRaw = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
	// Blank key on edit keeps stored value; new records require one
	const effectiveApiKey = existing ? apiKeyRaw || existing.apiKey : apiKeyRaw;

	const parsed = ProviderSchema.safeParse({
		name: body.name,
		baseUrl: body.baseUrl,
		apiKey: effectiveApiKey,
		models: Array.isArray(body.models)
			? body.models
			: typeof body.models === 'string'
				? body.models.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
				: []
	});

	if (!parsed.success) return c.json({ errors: fieldErrors(parsed.error) }, 400);

	const { name, baseUrl, apiKey, models } = parsed.data;
	const provider: AiProvider = {
		id: id || crypto.randomUUID().replace(/-/g, ''),
		name,
		baseUrl,
		apiKey,
		model: models[0],
		models
	};

	const idx = providers.findIndex((p) => p.id === provider.id);
	if (idx === -1) {
		providers.push(provider);
	} else {
		providers[idx] = provider;
	}

	await saveProviders(db, providers);
	if ((await getActiveProviderId(db)) === '' && providers.length === 1) {
		await setActiveProviderId(db, provider.id);
	}

	return c.json({ success: true, id: provider.id });
});

settingsRoutes.delete('/providers/:id', async (c) => {
	const id = c.req.param('id');
	const db = c.env.DB;
	const providers = await getProviders(db);
	const next = providers.filter((p) => p.id !== id);
	if (next.length === providers.length) {
		return c.json({ error: 'Provider tidak ditemukan' }, 404);
	}

	await saveProviders(db, next);
	if ((await getActiveProviderId(db)) === id) {
		await setActiveProviderId(db, '');
	}

	return c.json({ success: true });
});

// Active provider
settingsRoutes.get('/active', async (c) => {
	return c.json({ activeProviderId: await getActiveProviderId(c.env.DB) });
});

const SetActiveSchema = z.object({
	id: z.string().trim().default('')
});

settingsRoutes.post('/active', async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	const targetId = typeof body.id === 'string' ? body.id.trim() : typeof body.activeProviderId === 'string' ? body.activeProviderId.trim() : '';

	const db = c.env.DB;
	if (targetId !== '') {
		const providers = await getProviders(db);
		if (!providers.some((p) => p.id === targetId)) {
			return c.json({ error: 'Provider tidak ditemukan' }, 404);
		}
	}

	await setActiveProviderId(db, targetId);
	return c.json({ success: true });
});

// Password change
settingsRoutes.post('/password', async (c) => {
	const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
	// Map legacy current/next to old/new if provided
	const input = {
		old: body.old ?? body.current,
		new: body.new ?? body.next
	};

	const parsed = PasswordChangeSchema.safeParse(input);
	if (!parsed.success) {
		return c.json({ errors: fieldErrors(parsed.error) }, 400);
	}

	const db = c.env.DB;
	const stored = await getSetting(db, 'master_password_hash');
	if (!stored) return c.json({ error: 'Password belum diatur' }, 400);

	const ok = await verifyPassword(parsed.data.old, stored);
	if (!ok) return c.json({ error: 'Password saat ini salah' }, 400);

	const newHash = await hashPassword(parsed.data.new);
	await setSetting(db, 'master_password_hash', newHash);
	await issueSessionCookie(c, parsed.data.new);

	return c.json({ success: true });
});

export default settingsRoutes;
