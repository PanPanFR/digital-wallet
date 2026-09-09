import { fail, redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import {
	getProviders,
	getActiveProviderId,
	saveProviders,
	setActiveProviderId,
	toSummary,
	type AiProvider,
	ProviderFormSchema
} from '$lib/server/aiProviders';
import { getSetting, setSetting } from '$lib/server/db';
import { issueSessionCookie } from '$lib/server/session';
import { fieldErrors } from '$lib/server/validation';

const NewPasswordSchema = z.string().min(8, 'Password baru minimal 8 karakter');

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	const providers = await getProviders(db);
	return {
		providers: providers.map(toSummary),
		activeProviderId: await getActiveProviderId(db)
	};
};

export const actions: Actions = {
	'change-password': async ({ request, cookies, platform }: RequestEvent) => {
		const db = platform!.env.DB;
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		const stored = await getSetting(db, 'master_password_hash');
		if (!stored) return fail(400, { error: 'Password belum diatur' });
		if (!(await verifyPassword(current, stored))) {
			return fail(400, { error: 'Password saat ini salah' });
		}

		const parsed = NewPasswordSchema.safeParse(next);
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Password baru tidak valid' });
		}
		if (parsed.data !== confirm) {
			return fail(400, { error: 'Konfirmasi password tidak cocok' });
		}

		const newHash = await hashPassword(parsed.data);
		await setSetting(db, 'master_password_hash', newHash);
		await issueSessionCookie(cookies, parsed.data);
		redirect(303, '/settings?changed=1');
	},

	'save-provider': async ({ request, platform }: RequestEvent) => {
		const db = platform!.env.DB;
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const providers = await getProviders(db);
		const existing = id ? providers.find((p) => p.id === id) : undefined;
		const apiKey = String(form.get('apiKey') ?? '');
		const parsed = ProviderFormSchema.safeParse({
			name: String(form.get('name') ?? ''),
			baseUrl: String(form.get('baseUrl') ?? ''),
			// Blank key on edit keeps the stored value; new records require one.
			apiKey: existing ? apiKey || existing.apiKey : apiKey,
			models: String(form.get('models') ?? '')
		});
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });

		const { name, baseUrl, apiKey: key, models } = parsed.data;
		const provider: AiProvider = {
			id: id || crypto.randomUUID().replace(/-/g, ''),
			name,
			baseUrl,
			apiKey: key,
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
		return { success: true };
	},

	'delete-provider': async ({ request, platform }: RequestEvent) => {
		const db = platform!.env.DB;
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'ID provider tidak valid' });

		const providers = await getProviders(db);
		const next = providers.filter((p) => p.id !== id);
		if (next.length === providers.length) return fail(400, { error: 'Provider tidak ditemukan' });
		await saveProviders(db, next);

		if ((await getActiveProviderId(db)) === id) {
			await setActiveProviderId(db, ''); // cleared → env fallback
		}
		return { success: true };
	},

	'set-active': async ({ request, platform }: RequestEvent) => {
		const db = platform!.env.DB;
		const form = await request.formData();
		const id = String(form.get('id') ?? '').trim();
		const providers = await getProviders(db);
		if (!providers.some((p) => p.id === id)) return fail(400, { error: 'Provider tidak ditemukan' });
		await setActiveProviderId(db, id);
		return { success: true };
	}
};
