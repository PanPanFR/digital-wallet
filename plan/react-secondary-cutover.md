# Implementation Plan: React Secondary Features + Cutover

## Objective

Rebuild analytics, copilot, settings, backup/restore, theme and navigation in React; then delete SvelteKit, remove Svelte deps, update docs — leaving the repo a pure Vite+React+Hono app at parity.

## Scope

In: `Analytics` (Recharts donut + monthly bars, ≥4 distinct hues + legend swatches), `Copilot` chat (POST `/api/ai/report`, client replays last ≤8 turns, 503 graceful degradation), `Settings` (AI provider CRUD + set-active, change password, backup export JSON/CSV download + import merge report), `ThemeToggle` + theme init (class-based dark, `localStorage['ft-theme']`, system default), `Navigation` (desktop sidebar + mobile floating pill `#2c2f47/95` + orange Catat FAB + "Lainnya" sheet), manifest/icon wiring, `src/` + Svelte dep deletion, `docs/architecture.md` + `docs/index.md` refresh.
Out: new features, PWA service worker (stays unregistered stub until 2027-01-01), data migration (same D1, none needed).

## Context

Stack/conventions from plans 1–2: same SPA shell, `api/client.ts`, `queryKeys.ts`, `ModalShell`/`Toast` primitives (reuse, don't rebuild). Recharts replaces LayerChart (Svelte-only); `lucide-react` replaces `@lucide/svelte`. Endpoints used (restated standalone): `GET /api/analytics?month`, `POST /api/ai/report`, `GET/POST/DELETE /api/settings/providers`, `POST /api/settings/active`, `POST /api/settings/password`, `GET /api/backup/export`, `GET /api/backup/export.csv`, `POST /api/backup/import`. AI keys never reach client except inside password-gated settings forms; provider list uses `toSummary` shape. Backup import is id-merge with `{inserted,skipped}` report; warn file contains API keys (existing copy).

## Dependencies

Plans 1 and 2 merged (`ModalShell`, `Toast`, `queryKeys`, `index.css`, contract). New dep: `recharts` only (add in this plan if plan 1 skipped it).

## Files / Areas Likely Affected

- Create: `web/src/pages/Analytics.tsx|Copilot.tsx|Settings.tsx`, `web/src/components/Navigation.tsx|ThemeToggle.tsx`, `web/src/components/charts/*` (thin Recharts wrappers using `.lc-root`-equivalent CSS vars in `index.css`).
- Edit: `web/src/app.tsx` (append routes + nav shell), `web/src/index.css` (chart vars, nav, dark variant), `web/index.html` (theme init script, manifest link), `docs/architecture.md`, `docs/index.md` (plan tracking).
- Delete: `src/`, `svelte.config.js`, `static/sw.js` only if past 2027-01-01 (else keep stub), Svelte deps from `package.json` (`@sveltejs/*`, `svelte`, `svelte-check`, `layerchart`, `@lucide/svelte`).
- Keep: `schema.sql`, `migrations/`, `static/manifest.json`, `static/icon.svg`, `.dev.vars`, local D1 state.

## Implementation Steps

1. Analytics page (summary cards, Recharts donut category + bar monthly trend + per-wallet expenses; empty-month zero states).
2. Copilot (chat UI, history ≤8 turns client-side, provider/model override selects, 503 empty-state).
3. Settings (providers CRUD + active radio, change-password, backup export/import with result report + keys warning).
4. Theme + Navigation + `index.html` wiring + manifest.
5. Cutover: delete `src/` etc., prune deps, `npm install`, full verification, docs refresh.

## Acceptance Criteria

- Analytics numbers match old page for same month; donut ≥4 hues with matching legend.
- Copilot answers from live snapshot; no API key or full history persisted server-side; unconfigured → Indonesian 503 notice, rest of app unaffected.
- Backup round-trip: export → fresh local D1 → import restores wallets/tx/debts/payments/providers with correct `{inserted,skipped}`; CSV downloads parse.
- Theme persists across reload, no flash on first paint; mobile nav safe-area correct; FAB opens quick-add everywhere.
- Zero `svelte`/`layerchart` imports remain (`grep` clean); `npm run check && npm run test && npm run build` green; `wrangler dev` + `preview` smoke passes all 8 routes + login guard.

## Verification / Tests

- `npm run check && npm run test && npm run build`; `grep -ri "svelte\|layerchart" web/ worker/ shared/` empty.
- `npm run preview` full click-through: login → 8 pages → CRUD spot-checks → backup round-trip → theme flip → mobile 360px + desktop passes.
- Confirm Worker bundle size + free-tier quotas unchanged from plan 1 acceptance.

## Git (branch: feature/react-secondary-cutover)

Branch off `main` AFTER plan 2 merged. Merges LAST. After green, user runs `/integrate` per repo convention; plan files removed post-merge.

## Integration Notes

Merge order: plan 1 → plan 2 → this plan. Overlaps: `web/src/app.tsx` (append-only routes — rebase onto plan 2), `web/src/index.css` (append sections — rebase onto plan 2), `package.json` (add recharts here if missing). Deletion of `src/` happens ONLY in this plan's step 5 — never earlier, plans 1–2 need the Svelte files as spec.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|---|---|---|---|
| 1 analytics | designer | D | Own route + queries, no shared state with 2/3 |
| 2 copilot | designer | D | Own route, parallel to 1/3 |
| 3 settings + backup | builder | D | Form-heavy + API-adjacent, parallel to 1/2 |
| 4 theme + navigation | designer | — | Touches shell used by all pages, after 1–3 settle |
| 5 cutover + docs | builder + documenter | E (parallel pair) | Deletion+install+verify (builder) vs architecture/index refresh (documenter), disjoint files |
| Final full click-through report | tester | — | Independent verification before merge |
