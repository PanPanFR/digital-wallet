import { redirect, type ServerLoad, type RequestEvent } from '@sveltejs/kit';
import { listWallets } from '$lib/server/db';

export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
	if (!locals.session) redirect(303, '/login');
	const wallets = await listWallets(platform!.env.DB);
	return { wallets };
};
