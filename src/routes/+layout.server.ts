import { type ServerLoad, type RequestEvent } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }: RequestEvent) => {
	return { session: locals.session };
};
