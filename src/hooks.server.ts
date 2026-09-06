import { redirect, type Handle } from '@sveltejs/kit';
import { sessionCookieName, verifySessionToken } from '$lib/server/auth';

const PUBLIC_PATHS = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(sessionCookieName);
	const valid = token ? await verifySessionToken(token) : false;
	event.locals.session = valid;

	const path = event.url.pathname;
	const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'));

	if (!valid) {
		if (path.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		if (!isPublic) {
			redirect(303, '/login');
		}
	}

	if (valid && path === '/login') {
		redirect(303, '/');
	}

	return resolve(event);
};
