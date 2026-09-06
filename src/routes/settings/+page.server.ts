import { fail, redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '$lib/server/auth';
import { getSetting, setSetting } from '$lib/server/db';
import { issueSessionCookie } from '$lib/server/session';

const NewPasswordSchema = z.string().min(8, 'Password baru minimal 8 karakter');

export const load: ServerLoad = async ({ locals }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	return {};
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
	}
};
