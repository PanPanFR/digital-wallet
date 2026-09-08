# Deployment

What you'll get from this doc: how a push reaches production (Cloudflare Workers Builds), how to deploy manually, how to apply schema changes to the **remote** D1, where secrets live, and how to roll back. Local environment: [development.md](development.md).

## Pipeline

Primary path is **Cloudflare Workers Builds** — Cloudflare pulls the GitHub repo and deploys on push. The old GitHub Actions workflow was deliberately dropped (commit `49aa305d`); there is no `.github/workflows/` in the repo.

```
push to main (github.com/PanPanFR/digital-wallet)
  → Cloudflare Workers Builds
      build command: npm run build   (output .svelte-kit/cloudflare, read from wrangler.jsonc)
  → Worker "digital-wallet" + static assets published
```

One-time dashboard setup (manual, Cloudflare account owner): Workers & Pages → Create → **Workers Builds** → connect the repo → production branch `main`, build command `npm run build`. Compatibility date/flags come from `wrangler.jsonc` — don't duplicate them in the dashboard. Builds need access to the D1 database and secrets automatically once the project is connected.

## What must exist in the Cloudflare account

| Resource | Name | Where defined |
|---|---|---|
| Worker (via Builds project) | `digital-wallet` | `wrangler.jsonc` → `name` |
| D1 database | `digital-wallet-db` (id `a6c5170a-84d4-4077-9670-5dadeac0eba5`) | `wrangler.jsonc` → `d1_databases[0]` binding `DB` |
| Secrets | `SESSION_SECRET` (required), `GOOGLE_API_KEY` (optional) | set once, persist across deploys |
| Plain vars | `AI_BASE_URL`, `AI_MODEL` — only to override defaults | dashboard Variables, or omit |

Secrets (either path; they target the deployed Worker, not local dev):

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GOOGLE_API_KEY   # optional, enables the copilot
```

…or the Secrets section in the dashboard. A deploy without `SESSION_SECRET` boots but throws on every auth code path — verify after a fresh-account deploy.

## Manual deploy (fallback)

```bash
npm run deploy    # = npm run build && wrangler deploy
```

Use it for hotfixes when you don't want to wait for/trigger a Build. Both paths produce the same artifact; don't interleave them casually — a later Build from `main` overwrites manual pushes that aren't committed.

## Database schema changes

Schema changes are just edits to [`../schema.sql`](../schema.sql) — it is idempotent (`IF NOT EXISTS` / `INSERT OR IGNORE`), so re-applying is non-destructive. Apply to the **remote** database once:

```bash
npx wrangler d1 execute digital-wallet-db --remote --file=schema.sql
```

Same command with `--local` keeps your dev database identical. Verify:

```bash
npx wrangler d1 execute digital-wallet-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

**Structural changes** (new column, changed CHECK constraint) can't ride on `CREATE TABLE IF NOT EXISTS` — they need a dedicated migration script that rebuilds the table and copies rows, kept alongside for the record. The approved example is `plan/ux-data-model.md` Task 1 (`migrations/001-tx-date-transfer.sql`): commit it to `migrations/`, run it `--remote` **before** merging the code that expects the new shape, and smoke-test prod data after. Production rows are user data; the app is single-user, so a `--remote --command "SELECT COUNT(*) FROM transactions"` before/after is a cheap sanity check.

`wrangler.jsonc` has **no** top-level `migrations` block — deploys don't auto-apply SQL; executing schema files is an explicit operator step.

## Post-deploy checks

1. Open the Worker's `workers.dev` URL (or custom domain) → expect redirect to `/login`.
2. Login (or setup on a fresh DB) → dashboard numbers match local D1 queries.
3. With `GOOGLE_API_KEY` unset → `/copilot` parse returns "Fitur AI belum dikonfigurasi", nothing crashes.
4. `npx wrangler tail` while clicking around — observability is enabled in `wrangler.jsonc` (`observability.enabled: true`), so logs also appear in the dashboard.

## Rollback

Workers Builds and `wrangler deploy` both keep recent **versions** (immutable artifacts), so rollback is instant and doesn't require rebuilding:

- Dashboard: Workers → `digital-wallet` → **Versions** tab → roll back to a previous deployment.
- CLI: `npx wrangler deployments list` → `npx wrangler rollback <deployment-id>`.

Rollback does **not** revert D1 data or a destructive migration (a rebuilt table isn't restored by redeploying old code that expects the old shape — old code survives a migration that only *adds* columns; it does not if constraints narrowed, e.g. CHECK changes). This is why the guidance above says: run additive SQL first, deploy code second, and note the SQL step in whatever ships it.
