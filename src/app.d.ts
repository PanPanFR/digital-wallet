/// <reference types="@cloudflare/workers-types" />

declare global {
	namespace App {
		interface Locals {
			session: boolean;
		}
		interface Platform {
			env: {
				DB: D1Database;
				ASSETS: Fetcher;
				SESSION_SECRET?: string;
				GOOGLE_API_KEY?: string;
				AI_API_KEY?: string;
				AI_BASE_URL?: string;
				AI_MODEL?: string;
			};
			caches: CacheStorage & { default: Cache };
		}
		interface PageData {}
		interface Error {
			message: string;
			code?: string;
		}
	}
}

export {};
