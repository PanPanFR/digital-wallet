/**
 * AI provider storage: list of user-configured OpenAI-compatible providers
 * (base URL, API key, models) persisted in `app_settings` under
 * `ai_providers` (JSON array) and the active provider id under
 * `ai_active_provider`. No schema change.
 *
 * API keys are stored plaintext in D1: accepted tradeoff for a single-user
 * app behind a master password. The key is never sent to the client (server
 * loads strip it) and edit forms mask it (blank = keep stored value).
 */

import { z } from 'zod';
import { getSetting, setSetting } from './db';

export interface AiProvider {
	id: string;
	name: string;
	baseUrl: string;
	apiKey: string;
	/** Default model — first entry of `models` (kept in sync on save). */
	model: string;
	models: string[];
}

/** Shape safe to ship to the client — never contains apiKey. */
export interface AiProviderSummary {
	id: string;
	name: string;
	baseUrl: string;
	model: string;
	models: string[];
}

const PROVIDERS_KEY = 'ai_providers';
const ACTIVE_PROVIDER_KEY = 'ai_active_provider';

/** Form validation. `models` accepts an array or a comma/newline-separated string. */
export const ProviderFormSchema = z.object({
	name: z.string().trim().min(1, 'Nama wajib diisi').max(50, 'Nama terlalu panjang'),
	baseUrl: z.string().trim().url('Base URL tidak valid').max(300, 'URL terlalu panjang'),
	apiKey: z.string().trim().min(1, 'API key wajib diisi').max(500, 'API key terlalu panjang'),
	models: z.preprocess(
		(v) =>
			typeof v === 'string'
				? v
						.split(/[\n,]+/)
						.map((s) => s.trim())
						.filter(Boolean)
				: v,
		z.array(z.string().min(1)).min(1, 'Minimal satu model')
	)
});

/** JSON-API validation: same shape, `models` must already be an array. */
export const ProviderApiSchema = ProviderFormSchema.extend({
	models: z.array(z.string().trim().min(1)).min(1, 'Minimal satu model')
});

function isValidProvider(v: unknown): v is AiProvider {
	if (!v || typeof v !== 'object') return false;
	const o = v as Record<string, unknown>;
	return (
		typeof o.id === 'string' &&
		typeof o.name === 'string' &&
		typeof o.baseUrl === 'string' &&
		typeof o.apiKey === 'string' &&
		typeof o.model === 'string' &&
		Array.isArray(o.models) &&
		o.models.every((m) => typeof m === 'string')
	);
}

/** Defensive JSON parse — corrupt / wrong-shaped stored values become []. */
export function parseProviders(raw: string | null): AiProvider[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isValidProvider);
	} catch {
		return [];
	}
}

export async function getProviders(db: D1Database): Promise<AiProvider[]> {
	return parseProviders(await getSetting(db, PROVIDERS_KEY));
}

export async function saveProviders(db: D1Database, providers: AiProvider[]): Promise<void> {
	await setSetting(db, PROVIDERS_KEY, JSON.stringify(providers));
}

export async function getActiveProviderId(db: D1Database): Promise<string> {
	return (await getSetting(db, ACTIVE_PROVIDER_KEY)) ?? '';
}

export async function setActiveProviderId(db: D1Database, id: string): Promise<void> {
	await setSetting(db, ACTIVE_PROVIDER_KEY, id);
}

export function toSummary(p: AiProvider): AiProviderSummary {
	return { id: p.id, name: p.name, baseUrl: p.baseUrl, model: p.model, models: p.models };
}

/**
 * Resolve the provider to use for a request: explicit override id first,
 * else the active provider, else null (caller falls back to env config).
 */
export async function resolveProviderConfig(
	db: D1Database,
	overrideId?: string | null
): Promise<{ provider: AiProvider; baseUrl: string; apiKey: string; model: string } | null> {
	const providers = await getProviders(db);
	let provider = overrideId ? providers.find((p) => p.id === overrideId) : undefined;
	if (!provider) {
		const activeId = await getActiveProviderId(db);
		provider = providers.find((p) => p.id === activeId);
	}
	if (!provider) return null;
	return {
		provider,
		baseUrl: provider.baseUrl.replace(/\/$/, ''),
		apiKey: provider.apiKey,
		model: provider.model
	};
}
