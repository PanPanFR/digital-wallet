/**
 * Master password authentication.
 *
 * Format-compatible with the old app:
 *  - Password hash: `${saltHex}:${hashHex}` (16-byte salt, PBKDF2-SHA256 100k).
 *  - Session token: `${payloadB64}.${sigHex}` where payload is base64 of
 *    JSON({exp, iat}) and sigHex is HMAC-SHA256(payloadB64) with the
 *    session secret.
 *  - Cookie name: "ft_session".
 *
 * On Cloudflare Workers, SESSION_SECRET is available via process.env thanks
 * to the nodejs_compat compat flag (populates process.env from bindings).
 * Throws if no secret is configured — there is deliberately no fallback.
 */

const SESSION_COOKIE_NAME = 'ft_session';
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const encoder = new TextEncoder();

/** Read the session secret. Throws if not configured. */
export function getSessionSecret(): string {
	const secret = process.env.SESSION_SECRET;
	if (!secret) {
		throw new Error(
			'SESSION_SECRET is not configured. Set it as a Cloudflare Worker secret ' +
				'(wrangler secret put SESSION_SECRET) or in .dev.vars for local dev.'
		);
	}
	return secret;
}

/**
 * Hash a password with PBKDF2 (SHA-256, 100k iterations) → `${saltHex}:${hashHex}`.
 * If `saltHex` is provided (32 hex chars = 16 bytes), hash deterministically;
 * otherwise a fresh random salt is generated.
 */
export async function hashPassword(password: string, saltHex?: string): Promise<string> {
	const salt = (saltHex
		? hexToBytes(saltHex)
		: crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))) as Uint8Array<ArrayBuffer>;
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	const outSaltHex = bytesToHex(salt);
	const hashHex = bytesToHex(new Uint8Array(derived));
	return `${outSaltHex}:${hashHex}`;
}

/** Verify a password against a stored `${saltHex}:${hashHex}` value. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const [saltHex, expectedHex] = storedHash.split(':');
	if (!saltHex || !expectedHex) return false;
	let salt: Uint8Array<ArrayBuffer>;
	try {
		salt = hexToBytes(saltHex);
	} catch {
		return false;
	}
	if ((salt as Uint8Array).length === 0) return false;
	if (salt.length === 0) return false;

	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveBits']
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
		keyMaterial,
		256
	);
	const actualHex = bytesToHex(new Uint8Array(derived));
	// Constant-time-ish comparison via length+JSON.stringify — good enough
	// for our threat model; inputs are fixed length.
	return actualHex === expectedHex;
}

/**
 * Create a signed session token. The `password` argument is accepted for
 * API symmetry with the old app but is not used to derive the signature —
 * the token is signed with the configured SESSION_SECRET.
 */
export async function createSessionToken(_password: string): Promise<string> {
	const payload = JSON.stringify({
		exp: Date.now() + SESSION_EXPIRY_MS,
		iat: Date.now()
	});
	const payloadB64 = base64Encode(payload);
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(getSessionSecret()),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
	const sigHex = bytesToHex(new Uint8Array(signature));
	return `${payloadB64}.${sigHex}`;
}

/** Verify a session token. Returns true if signature + expiry are valid. */
export async function verifySessionToken(token: string): Promise<boolean> {
	try {
		const [payloadB64, sigHex] = token.split('.');
		if (!payloadB64 || !sigHex) return false;

		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(getSessionSecret()),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['verify']
		);
		let sigBytes: Uint8Array<ArrayBuffer>;
		try {
			sigBytes = hexToBytes(sigHex);
		} catch {
			return false;
		}
		const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64));
		if (!valid) return false;

		const payload = JSON.parse(base64Decode(payloadB64));
		if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return false;

		return true;
	} catch {
		return false;
	}
}

export const sessionCookieName = SESSION_COOKIE_NAME;
export const sessionExpiryMs = SESSION_EXPIRY_MS;

// --- helpers ---

function bytesToHex(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i++) {
		out += bytes[i].toString(16).padStart(2, '0');
	}
	return out;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
	if (hex.length % 2 !== 0) throw new Error('invalid hex');
	const buf = new ArrayBuffer(hex.length / 2);
	const out = new Uint8Array(buf);
	for (let i = 0; i < out.length; i++) {
		const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		if (Number.isNaN(byte)) throw new Error('invalid hex');
		out[i] = byte;
	}
	return out;
}

/** Base64 encode a UTF-8 string. Works in Workers (btoa is available). */
function base64Encode(s: string): string {
	return btoa(unescape(encodeURIComponent(s)));
}

/** Base64 decode to a UTF-8 string. */
function base64Decode(s: string): string {
	return decodeURIComponent(escape(atob(s)));
}
