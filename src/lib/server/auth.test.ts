/**
 * Auth unit tests — derived from old `src/lib/auth.ts` behavior.
 * Module under test: $lib/server/auth (NOT yet implemented).
 *
 * The new module MUST stay format-compatible with the old app:
 *  - Password hash format: `${saltHex}:${hashHex}` (salt = 16 bytes / 32 hex,
 *    digest = SHA-256 PBKDF2 100k iter / 64 hex).
 *  - Session token format: `${payloadB64}.${sigHex}` where payload is
 *    base64(JSON({exp, iat})) and sigHex is HMAC-SHA256 of the base64 payload.
 *  - Cookie name: "dw_session".
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	hashPassword,
	verifyPassword,
	createSessionToken,
	verifySessionToken,
	sessionCookieName
} from '$lib/server/auth';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

beforeAll(() => {
	// The new auth module reads SESSION_SECRET from env. Set a stable value
	// for the duration of this test file.
	process.env.SESSION_SECRET = 'test-session-secret-do-not-use-in-prod';
});

afterAll(() => {
	if (ORIGINAL_SECRET === undefined) {
		delete process.env.SESSION_SECRET;
	} else {
		process.env.SESSION_SECRET = ORIGINAL_SECRET;
	}
});

describe('sessionCookieName', () => {
	it('equals the cookie name used by the old app', () => {
		expect(sessionCookieName).toBe('dw_session');
	});
});

describe('hashPassword / verifyPassword', () => {
	it('verifies the correct password against its own hash', async () => {
		const stored = await hashPassword('correct-horse-battery-staple');
		expect(await verifyPassword('correct-horse-battery-staple', stored)).toBe(true);
	});

	it('rejects an incorrect password', async () => {
		const stored = await hashPassword('hunter2');
		expect(await verifyPassword('hunter3', stored)).toBe(false);
	});

	it('produces a stored value in the `saltHex:hashHex` format the old verifyPassword parses', async () => {
		const stored = await hashPassword('whatever');
		const [saltHex, hashHex] = stored.split(':');
		expect(saltHex).toBeTruthy();
		expect(hashHex).toBeTruthy();
		// 16 random bytes = 32 hex chars; SHA-256 digest = 64 hex chars.
		expect(saltHex).toHaveLength(32);
		expect(hashHex).toHaveLength(64);
		expect(saltHex).toMatch(/^[0-9a-f]+$/);
		expect(hashHex).toMatch(/^[0-9a-f]+$/);
	});

	it('uses a fresh random salt per call (two hashes of the same password differ)', async () => {
		const a = await hashPassword('same-password');
		const b = await hashPassword('same-password');
		expect(a).not.toBe(b);
		expect(await verifyPassword('same-password', a)).toBe(true);
		expect(await verifyPassword('same-password', b)).toBe(true);
	});

	it('rejects malformed stored values (no colon, empty parts)', async () => {
		expect(await verifyPassword('x', 'no-colon-here')).toBe(false);
		expect(await verifyPassword('x', ':missing-both')).toBe(false);
		expect(await verifyPassword('x', 'missing-hash:')).toBe(false);
	});

	it('is deterministic when an explicit salt is provided', async () => {
		const salt = '0123456789abcdef0123456789abcdef';
		const a = await hashPassword('pinned-salt', salt);
		const b = await hashPassword('pinned-salt', salt);
		expect(a).toBe(b);
		expect(await verifyPassword('pinned-salt', a)).toBe(true);
		expect(await verifyPassword('pinned-salt', b)).toBe(true);
	});
});

describe('createSessionToken / verifySessionToken', () => {
	it('verifies a freshly-created token', async () => {
		const token = await createSessionToken('irrelevant');
		expect(await verifySessionToken(token)).toBe(true);
	});

	it('produces a `payloadB64.signatureHex` token shape', async () => {
		const token = await createSessionToken('irrelevant');
		const parts = token.split('.');
		expect(parts).toHaveLength(2);
		const [payloadB64, sigHex] = parts;
		expect(payloadB64).toBeTruthy();
		expect(sigHex).toBeTruthy();
		// HMAC-SHA256 = 32 bytes = 64 hex chars.
		expect(sigHex).toHaveLength(64);
		expect(sigHex).toMatch(/^[0-9a-f]+$/);
		// payload must be base64(JSON) with an `exp` field
		const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8'));
		expect(typeof payload.exp).toBe('number');
	});

	it('rejects a token with one flipped character in the signature', async () => {
		const token = await createSessionToken('irrelevant');
		const [payloadB64, sigHex] = token.split('.');
		const flipped = sigHex[0] === '0' ? '1' : '0';
		const tampered = `${payloadB64}.${flipped}${sigHex.slice(1)}`;
		expect(await verifySessionToken(tampered)).toBe(false);
	});

	it('rejects a token with a tampered payload (HMAC mismatch)', async () => {
		const token = await createSessionToken('irrelevant');
		const [_payloadB64, sigHex] = token.split('.');
		// Mutate the payload: replace the first char of the base64 string
		// with a different valid base64 char so the structure still parses
		// but the HMAC no longer matches.
		const tampered = `A${token.slice(1)}`;
		expect(tampered).not.toBe(token);
		expect(await verifySessionToken(tampered)).toBe(false);
	});

	it('rejects an expired token', async () => {
		// Build a token with exp in the past using the same on-the-wire format
		// the implementation produces. We sign it ourselves with the same
		// secret the module uses, so HMAC verification passes; only the
		// exp check should fail.
		const encoder = new TextEncoder();
		const payload = { exp: Date.now() - 1000, iat: Date.now() - 60_000 };
		const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(process.env.SESSION_SECRET),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
		const sigHex = Array.from(new Uint8Array(sig))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		const expiredToken = `${payloadB64}.${sigHex}`;

		expect(await verifySessionToken(expiredToken)).toBe(false);
	});

	it('rejects a malformed token (no dot, missing parts)', async () => {
		expect(await verifySessionToken('no-dot-here')).toBe(false);
		expect(await verifySessionToken('.missing-payload')).toBe(false);
		expect(await verifySessionToken('missing-sig.')).toBe(false);
		expect(await verifySessionToken('')).toBe(false);
	});

	it('rejects a token whose payload does not decode to valid JSON', async () => {
		// valid HMAC over non-JSON base64 payload → exp check fails or JSON parse fails
		const encoder = new TextEncoder();
		const payloadB64 = Buffer.from('not json at all', 'utf8').toString('base64');
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(process.env.SESSION_SECRET),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
		const sigHex = Array.from(new Uint8Array(sig))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		expect(await verifySessionToken(`${payloadB64}.${sigHex}`)).toBe(false);
	});
});
