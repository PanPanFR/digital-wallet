import { dev } from '$app/environment';
import { createSessionToken, sessionCookieName, sessionExpiryMs } from '$lib/server/auth';
import type { Cookies } from '@sveltejs/kit';

/**
 * Set the session cookie consistently for login/setup/change-password.
 * Keeps `dev`-aware `secure` flagging out of the route files.
 */
export async function issueSessionCookie(cookies: Cookies, password: string) {
	const token = await createSessionToken(password);
	cookies.set(sessionCookieName, token, {
		path: '/',
		httpOnly: true,
		secure: !dev,
		sameSite: 'lax',
		maxAge: Math.floor(sessionExpiryMs / 1000)
	});
}
