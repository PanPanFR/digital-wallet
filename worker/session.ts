import { setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { createSessionToken, sessionCookieName, sessionExpiryMs } from './auth';
import type { Env } from './env';

/**
 * Set the session cookie consistently for login/setup.
 * `secure` follows the request scheme (https in prod, http locally).
 */
export async function issueSessionCookie(c: Context<{ Bindings: Env }>, password: string) {
	const token = await createSessionToken(password, c.env.SESSION_SECRET);
	const secure = new URL(c.req.url).protocol === 'https:';
	setCookie(c, sessionCookieName, token, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'Lax',
		maxAge: Math.floor(sessionExpiryMs / 1000)
	});
}

/** Clear the session cookie. */
export function clearSessionCookie(c: Context<{ Bindings: Env }>) {
	deleteCookie(c, sessionCookieName, { path: '/' });
}
