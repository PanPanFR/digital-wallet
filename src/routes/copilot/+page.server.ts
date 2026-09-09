import { redirect, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { getActiveProviderId, getProviders, toSummary } from '$lib/server/aiProviders';

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const db = platform!.env.DB;
	// Client gets id/name/models only — never the apiKey.
	const providers = (await getProviders(db)).map(toSummary);
	return {
		providers,
		activeProviderId: await getActiveProviderId(db)
	};
};
