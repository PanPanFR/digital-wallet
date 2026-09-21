import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';
import { hashPassword, verifyPassword, sessionCookieName } from '../auth';
import { getSetting, hitRateLimit, setSetting } from '../db';
import { clearSessionCookie, issueSessionCookie } from '../session';
import type { Env } from '../env';

const PasswordSchema = z.string().min(8, 'Password minimal 8 karakter');

export const authRoute = new Hono<{ Bindings: Env }>();

/** Public: tells the SPA whether to show setup, login, or the app. */
authRoute.get('/status', async (c) => {
	const hash = await getSetting(c.env.DB, 'master_password_hash');
	const token = getCookie(c, sessionCookieName);
	let authenticated = false;
	if (token) {
		const { verifySessionToken } = await import('../auth');
		authenticated = await verifySessionToken(token);
	}
	return c.json({ setupRequired: !hash, authenticated });
});

authRoute.post('/setup', async (c) => {
	const db = c.env.DB;
	if (await getSetting(db, 'master_password_hash')) {
		return c.json({ error: 'Password sudah diatur. Gunakan login.' }, 403);
	}
	const { password } = (await c.req.json().catch(() => ({}))) as { password?: unknown };
	const parsed = PasswordSchema.safeParse(password);
	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0]?.message ?? 'Password tidak valid' }, 400);
	}
	await setSetting(db, 'master_password_hash', await hashPassword(parsed.data));
	await issueSessionCookie(c, parsed.data);
	return c.json({ ok: true });
});

authRoute.post('/login', async (c) => {
	const db = c.env.DB;
	if (!(await hitRateLimit(db, 'login', 15 * 60 * 1000, 5))) {
		return c.json({ error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' }, 429);
	}
	const { password } = (await c.req.json().catch(() => ({}))) as { password?: unknown };
	const parsed = PasswordSchema.safeParse(password);
	if (!parsed.success) {
		return c.json({ error: 'Password minimal 8 karakter' }, 400);
	}
	const stored = await getSetting(db, 'master_password_hash');
	if (!stored) {
		return c.json({ error: 'Belum ada password. Atur password baru.' }, 400);
	}
	if (!(await verifyPassword(parsed.data, stored))) {
		return c.json({ error: 'Password salah' }, 400);
	}
	await issueSessionCookie(c, parsed.data);
	return c.json({ ok: true });
});

authRoute.post('/logout', (c) => {
	clearSessionCookie(c);
	return c.json({ ok: true });
});
