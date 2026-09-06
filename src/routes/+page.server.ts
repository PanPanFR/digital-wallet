import { redirect, type Actions, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { sessionCookieName } from '$lib/server/auth';

export const load: ServerLoad = async ({ locals }: RequestEvent) => {
	// The real dashboard load is implemented in Task 5. This stub keeps
	// the root route working so the logout action has a page to live on.
	void locals;
	return {};
};

export const actions: Actions = {
	logout: async ({ cookies }: RequestEvent) => {
		cookies.delete(sessionCookieName, { path: '/' });
		redirect(303, '/login');
	}
};
