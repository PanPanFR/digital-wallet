# Documentation Index

Digital Wallet — single-user finance tracker on SvelteKit 2 + Cloudflare Workers + D1. Start with the [README](../README.md) for what the app is and how to run it; this is the map of the rest.

## Reference & explanation

| Doc | What you'll accomplish |
|---|---|
| [architecture.md](architecture.md) | Understand how a request flows (hooks → load/actions → D1), the runtime shape on Workers, layering, and the key design decisions with their trade-offs |
| [data-model.md](data-model.md) | Look up every table, column, constraint, index, and the computed-balance queries; learn the `created_at` format gotcha before writing any date query |
| [development.md](development.md) | Set up a working local environment from scratch (Node, wrangler auth, local D1, `.dev.vars`), run dev/tests/checks, and fix common wrangler/dev failures |
| [deployment.md](deployment.md) | Ship a change: Workers Builds auto-deploy, manual `wrangler deploy`, applying the D1 schema remotely, managing secrets, rolling back |

## Historical design specs (read-only)

These record *why* the app was built the way it was; where they contradict current code, the code and [architecture.md](architecture.md) win.

- [specs/2026-09-03-svelte-rewrite-design.md](specs/2026-09-03-svelte-rewrite-design.md) — the Next.js → SvelteKit rewrite: stack, auth flow, form-actions pattern, PWA approach (the service-worker parts were later reverted, see architecture.md).
- [specs/2026-09-08-digital-wallet-design.md](specs/2026-09-08-digital-wallet-design.md) — the finance-tracker → digital-wallet transformation: wallet data model, computed balances, rebrand, deploy-via-GitHub decision.

## Approved plans (not yet in `main`)

- [../plan/ux-data-model.md](../plan/ux-data-model.md) — transaction `date` column, `transfer` type with `to_wallet_id` (excluded from aggregates), editable copilot preview, list search/category filter/pagination, analytics fixes. Money-path change; requires a D1 migration (local **and** remote) before the UI lands.
- [../plan/ux-mobile-settings.md](../plan/ux-mobile-settings.md) — logout + theme toggle on mobile via the Pengaturan page (today both exist only in the desktop sidebar). Independent of the above.

Neither plan's behavior is implemented in `main` as of this writing — do not document them as current.
