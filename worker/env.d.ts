/// <reference types="@cloudflare/workers-types" />

/** Cloudflare Worker bindings (D1 binding `DB` unchanged). */
export interface Env {
	DB: D1Database;
	ASSETS: Fetcher;
	SESSION_SECRET?: string;
	GOOGLE_API_KEY?: string;
	AI_BASE_URL?: string;
	AI_MODEL?: string;
}
