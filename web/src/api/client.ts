export class ApiError extends Error {
	status: number;
	data: unknown;

	constructor(status: number, data: unknown) {
		const msg =
			(data as { error?: string } | null)?.error ?? `Request gagal (${status})`;
		super(msg);
		this.name = 'ApiError';
		this.status = status;
		this.data = data;
	}

	get fieldErrors(): Record<string, string> {
		const errors = (this.data as { errors?: Record<string, string> } | null)?.errors;
		return errors ?? {};
	}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body !== undefined && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	const res = await fetch(path, { ...init, headers, credentials: 'include' });

	const text = await res.text();
	let data: unknown = null;
	if (text) {
		try {
			data = JSON.parse(text);
		} catch {
			data = { error: text };
		}
	}

	if (res.status === 401) {
		if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
			window.location.href = '/login';
		}
		throw new ApiError(401, data ?? { error: 'Unauthorized' });
	}

	if (!res.ok) throw new ApiError(res.status, data);
	return data as T;
}

export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, body?: unknown) =>
	api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
export const patch = <T,>(path: string, body?: unknown) =>
	api<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });
export const del = <T,>(path: string) => api<T>(path, { method: 'DELETE' });
export const apiFetch = api;
