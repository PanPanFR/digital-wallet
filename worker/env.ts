/** Cloudflare Worker bindings. */
export interface Env {
	DB: D1Database;
	ASSETS: Fetcher;
	SESSION_SECRET?: string;
	GOOGLE_API_KEY?: string;
	AI_BASE_URL?: string;
	AI_MODEL?: string;
}
