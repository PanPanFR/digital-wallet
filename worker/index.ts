import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { sessionCookieName, verifySessionToken } from './auth';
import { authRoute } from './routes/auth';
import { walletsRoute } from './routes/wallets';
import { transactionRoutes } from './routes/transactions';
import { debtRoutes } from './routes/debts';
import { dashboardRoutes } from './routes/dashboard';
import { aiRoutes } from './routes/ai';
import { backupRoutes } from './routes/backup';
import { settingsRoutes } from './routes/settings';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

// Bridge c.env into process.env so auth/ai env reads work in Cloudflare Workers / nodejs_compat.
app.use('/api/*', async (c, next) => {
	if (c.env.SESSION_SECRET !== undefined) process.env.SESSION_SECRET = c.env.SESSION_SECRET;
	if (c.env.GOOGLE_API_KEY !== undefined) process.env.GOOGLE_API_KEY = c.env.GOOGLE_API_KEY;
	if (c.env.AI_BASE_URL !== undefined) process.env.AI_BASE_URL = c.env.AI_BASE_URL;
	if (c.env.AI_MODEL !== undefined) process.env.AI_MODEL = c.env.AI_MODEL;
	await next();
});

// Public auth endpoints (status/setup/login/logout)
app.route('/api/auth', authRoute);

// Guard every other /api/* route: valid signed session cookie or JSON 401
// (never a redirect — this is an API, clients handle the redirect).
app.use('/api/*', async (c, next) => {
	const token = getCookie(c, sessionCookieName);
	const valid = token ? await verifySessionToken(token) : false;
	if (!valid) return c.json({ error: 'Unauthorized' }, 401);
	await next();
});

app.route('/api/wallets', walletsRoute);
app.route('/api/transactions', transactionRoutes);
app.route('/api/debts', debtRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/backup', backupRoutes);
app.route('/api/settings', settingsRoutes);

// SPA fallback for any non-asset path (assets are served first by wrangler assets routing).
app.all('*', (c) => c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url))));

export default app;
