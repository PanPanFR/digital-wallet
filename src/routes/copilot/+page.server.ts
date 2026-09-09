import { redirect, type ServerLoad, type RequestEvent } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
};
