import { fail, redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getSetting, hitRateLimit, setSetting } from '$lib/server/db';
import { issueSessionCookie } from '$lib/server/session';

const PasswordSchema = z.string().min(8, 'Password minimal 8 karakter');

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (locals.session) redirect(303, '/');
	const db = platform!.env.DB;
	const hash = await getSetting(db, 'master_password_hash');
	return { mode: hash ? ('login' as const) : ('setup' as const) };
};

export const actions: Actions = {
	setup: async ({ request, cookies, platform }: RequestEvent) => {
		const db = platform!.env.DB;
		const existing = await getSetting(db, 'master_password_hash');
		if (existing) return fail(403, { error: 'Password sudah diatur. Gunakan login.' });

		const form = await request.formData();
		const parsed = PasswordSchema.safeParse(form.get('password'));
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Password tidak valid' });
		}
		const password = parsed.data;

		const hash = await hashPassword(password);
		await setSetting(db, 'master_password_hash', hash);
		await issueSessionCookie(cookies, password);
		redirect(303, '/');
	},

	login: async ({ request, cookies, platform }: RequestEvent) => {
		const db = platform!.env.DB;
		const allowed = await hitRateLimit(db, 'login', 15 * 60 * 1000, 5);
		if (!allowed) {
			return fail(429, { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' });
		}

		const form = await request.formData();
		const parsed = PasswordSchema.safeParse(form.get('password'));
		if (!parsed.success) {
			return fail(400, { error: 'Password minimal 8 karakter' });
		}
		const password = parsed.data;

		const stored = await getSetting(db, 'master_password_hash');
		if (!stored) {
			return fail(400, { error: 'Belum ada password. Atur password baru.' });
		}
		const ok = await verifyPassword(password, stored);
		if (!ok) {
			return fail(400, { error: 'Password salah' });
		}
		await issueSessionCookie(cookies, password);
		redirect(303, '/');
	}
};
