# Implementation Plan: UI Visual Overhaul (All Pages)

> **For agentic workers:** execute task-by-task, top to bottom, checking off each step. Verify after every task before moving on. Do not change routes, behavior, copy, validation, or data semantics — this is presentation-only.

**Goal:** Make the whole app look designed rather than default: deepen the existing visual system, add motion/polish consistently, and use `layerchart` for richer data visualization. No gradients anywhere. No full UI-system dependency.

**Architecture:** Keep the current design system and extend it. One new runtime dependency (`layerchart`, SVG-only imports) powers charts on Beranda + Analitik. `src/app.css` carries the no-gradient token layer (card depth, section rhythm, chart theme vars, focus/selection, reduced motion). Route pages are polished file-by-file without touching shared behavior. Charts keep textual legends/lists so tooltips are never the only data source.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes · Tailwind 4 (no config file, class-based dark mode) · TypeScript strict · Vitest (node env; UI verified manually) · Cloudflare Workers + D1 (untouched) · `@lucide/svelte` icons (already used) · `layerchart` (new, charts only).

**Spec:** No separate spec exists; this plan is the source of truth. User-locked choices: scope = all pages; visual direction = B (polish existing system + one chart lib); gradients forbidden.

## Global Constraints

- UI copy Indonesian, code/docs English.
- No `linear-gradient`, `radial-gradient`, `LinearGradient`, or `RadialGradient` in new/edited app code. Solid fills only; area fills (if used) must be solid color with opacity, not gradient fades.
- All SQL stays in `src/lib/server/db.ts`; every DB function takes `D1Database` first. Balances computed, never stored.
- Mutations stay on SvelteKit form actions + `enhance`/`invalidateAll`; no hand-rolled `fetch`.
- Server-side zod remains the only validation source.
- Keep class-based dark mode parity for every changed surface.
- Respect reduced motion: reuse the existing global reduced-motion rule and `prefersReducedMotion`-gated transitions; do not add motion that ignores it.
- Verification: `npm run check && npm run test`, plus `npm run build` because this adds a dependency and client charts.
- No D1 migration and no `--remote` work.
- Do not add `shadcn-svelte`, `Skeleton`, `Flowbite Svelte`, `DaisyUI`, `Bits UI`, `Melt UI`, `SvelteBlocks`, or `CN Blocks`. The only new dependency is `layerchart`.

## Context (verified against code and official docs)

| Fact | Location/source |
|---|---|
| All route pages share `app.css` tokens (`.card`, `.btn*`, `.input`, `.chip`, `.label`) | `src/app.css:37-69`; route `+page.svelte` files below |
| Route surfaces to polish | `src/routes/+page.svelte`, `src/routes/analytics/+page.svelte`, `src/routes/copilot/+page.svelte`, `src/routes/hutang/+page.svelte`, `src/routes/login/+page.svelte`, `src/routes/settings/+page.svelte`, `src/routes/transactions/+page.svelte`, `src/routes/wallets/+page.svelte`, `src/routes/+error.svelte` |
| Analytics already loads chart-ready data | `src/routes/analytics/+page.server.ts:10-15` returns `month`, `categoryTotals`, `monthlyTotals`, `walletTotals` |
| Home load lacks monthly trend data | `src/routes/+page.server.ts:19-26` returns `totals`, `wallets`, `recent`, `summary`, `debtTotals`, `month` |
| Monthly trend helper already exists and is tested indirectly | `src/lib/server/db.ts:380-419` `getMonthlyTotals(db, months)` |
| Existing analytics charts are hand-rolled SVG/CSS | `src/routes/analytics/+page.svelte:48-221` |
| `layerchart` latest researched version supports Svelte 5 and Tailwind 4 | `layerchart@2.5.0`, `peerDependencies: svelte ^5.0.0`; Tailwind 4 first-class/optional |
| `layerchart` has per-layer SVG imports and high-level wrappers | `layerchart/svg`; `LineChart`, `AreaChart`, `BarChart`, `PieChart`, `Tooltip`, `Legend`, `Axis`, `Grid` documented |
| `layerchart` theming uses `.lc-root-container` CSS vars; framework theme CSS files are optional | official getting-started guide |
| Charts must not be hover-only | existing analytics keeps legend/progress lists; preserve equivalent text |

## Dependencies

- New runtime dependency: `layerchart` (installed in Task 1; `package.json` + `package-lock.json` committed).
- No other new dependency.
- Sibling plans `debt-delete-with-payments.md` and `mobile-bottom-nav-sheet.md` share files with this plan; see Integration Notes for sequencing.

## Files / Areas Likely Affected

- Modify (dependency + data): `package.json`, `package-lock.json`, `src/routes/+page.server.ts`
- Modify (shared visual foundation only): `src/app.css`
- Modify (route presentation only): all files listed in the Context table above
- Create: none (use `layerchart` components directly; do not invent a chart abstraction layer)
- Track: `docs/index.md` (already updated when this plan was approved)
- Do not edit: `schema.sql`, `migrations/*`, `src/lib/server/validation.ts`, `src/hooks.server.ts`, worker/D1 config, secrets/env handling

## Interfaces (frozen before coding)

```ts
// Home load gains one field; existing fields unchanged.
type HomeDataAddition = { trend: MonthlyTotal[] };
// MonthlyTotal shape already exists via getMonthlyTotals:
type MonthlyTotal = { month: string; income: number; expense: number };
```

```ts
// Chart imports must use SVG-only entry where available.
import { LineChart, AreaChart, BarChart, PieChart, Tooltip, Legend, Axis, Grid } from 'layerchart/svg';
```

```css
/* LayerChart theme must map to existing palette; no framework theme import. */
.lc-root-container {
	--color-primary: var(--color-orange-600);
	--color-surface-100: var(--color-white);
	--color-surface-200: var(--color-slate-100);
	--color-surface-300: var(--color-slate-300);
	--color-surface-content: var(--color-slate-900);
}
html.dark .lc-root-container {
	--color-primary: var(--color-orange-400);
	--color-surface-100: var(--color-slate-900);
	--color-surface-200: var(--color-slate-800);
	--color-surface-300: var(--color-slate-700);
	--color-surface-content: var(--color-slate-100);
}
```

## Implementation Steps

### Task 1: Dependency + home trend data

Files: `package.json`, `package-lock.json`, `src/routes/+page.server.ts`

- [ ] **Step 1.1** Install the chart library and commit the lockfile change with code:

```bash
npm install -S layerchart
```

- [ ] **Step 1.2** Read the installed version’s official docs first (doc-first for a new dependency): `layerchart` getting-started, `LineChart`/`AreaChart`/`BarChart`/`PieChart`, `Tooltip`, styling/dark-mode, and bundle-size guidance. Use SVG-only imports (`layerchart/svg`) and no gradient/pattern-fill components.
- [ ] **Step 1.3** Extend home `load` with monthly trend data. In `src/routes/+page.server.ts`, add `getMonthlyTotals` to the `db` import, add `getMonthlyTotals(db, 6)` to the existing `Promise.all`, and return it as `trend`:

```ts
import {
	createTransaction,
	getDebtDirectionTotals,
	getKindTotals,
	getMonthlySummary,
	getMonthlyTotals,
	getWalletBalances,
	listTransactions
} from '$lib/server/db';
```

```ts
	const [totals, wallets, recent, summary, debtTotals, trend] = await Promise.all([
		getKindTotals(db),
		getWalletBalances(db),
		listTransactions(db, { limit: 5 }),
		getMonthlySummary(db, month),
		getDebtDirectionTotals(db),
		getMonthlyTotals(db, 6)
	]);
	return { totals, wallets, recent, summary, debtTotals, month, trend };
```

- [ ] **Step 1.4** Run `npm run check` → 0 errors. Do not restyle anything yet.

### Task 2: Shared no-gradient visual foundation

Files: `src/app.css` only

- [ ] **Step 2.1** Deepen `.card` without gradients: keep the existing radius/border approach, add restrained solid depth (for example layered border + soft shadow) that works in light and dark modes.
- [ ] **Step 2.2** Standardize section rhythm and hierarchy with utilities/classes already in the repo where possible; add only the smallest missing presentational helpers needed by every page (for example consistent page eyebrow/title/subtitle spacing). Do not create components or abstractions for behavior.
- [ ] **Step 2.3** Add the `.lc-root-container` light/dark variable mapping from Interfaces. Do not import any `layerchart/*-theme.css` file.
- [ ] **Step 2.4** Keep/extend focus, selection, and reduced-motion behavior. New motion must use the same short durations already used by `Toast`/`ModalShell`/nav sheet and must collapse under reduced motion.
- [ ] **Step 2.5** Run `npm run check` → 0 errors. This task must not edit route files.

### Task 3: Beranda + Analitik charts and page polish

Files: `src/routes/+page.svelte`, `src/routes/analytics/+page.svelte` only

- [ ] **Step 3.1** Beranda: add a compact monthly income/expense visualization using the new `trend` field. Prefer a grouped `BarChart`; use `LineChart` only if grouped bars cannot cleanly show income vs expense at mobile width. Keep the existing hero numbers/cards as the primary information.
- [ ] **Step 3.2** Beranda: polish hierarchy, spacing, list rows, chips, empty states, and pressed/hover states. Do not change destinations, filters, forms, validation, or data.
- [ ] **Step 3.3** Analitik: replace hand-rolled chart markup with `layerchart` equivalents while preserving data shapes, copy, month labels, legends, and accessible names. Keep an equivalent textual list/legend wherever a chart currently has one; tooltips must enhance, not replace, readable data.
- [ ] **Step 3.4** Analitik: polish the same presentational concerns as Beranda. Keep month switching, filters, calculations, and empty states behavior-identical.
- [ ] **Step 3.5** Run `npm run check` → 0 errors. Search edited files for `Gradient`, `linear-gradient`, and `radial-gradient`; only unrelated historical/docs text may remain, never chart/fill code.

### Task 4: Remaining routes presentation polish

Files (route files only; no shared components): `src/routes/transactions/+page.svelte`, `src/routes/wallets/+page.svelte`, `src/routes/hutang/+page.svelte`, `src/routes/copilot/+page.svelte`, `src/routes/settings/+page.svelte`, `src/routes/login/+page.svelte`, `src/routes/+error.svelte`

- [ ] **Step 4.1** Apply the frozen Task 2 foundation consistently: headers/eyebrows, card spacing, list-row hover/pressed states, tabular numerals for money, icon-tile consistency, form spacing/label/error proximity, empty-state hierarchy and actions.
- [ ] **Step 4.2** Preserve every route, action, validation message, toast, modal behavior, redirect, filter, selection, bulk behavior, AI behavior, settings behavior, and login behavior. Presentation-only means no logic changes.
- [ ] **Step 4.3** Do not edit shared components or sibling-plan-owned behavior files to achieve polish; if a shared component needs a visual change, do it through `src/app.css` tokens unless the change is route-local markup.
- [ ] **Step 4.4** Run `npm run check` → 0 errors.

### Task 5: Build, tests, and manual verification

- [ ] **Step 5.1** Run `npm run test` → all green.
- [ ] **Step 5.2** Run `npm run build` → success. If Windows reports `EPERM ... .svelte-kit\cloudflare`, stop any running `wrangler dev`/workerd process first, then rerun. Do not ship runtime-sensitive changes without a successful build.
- [ ] **Step 5.3** Manual pass in light and dark modes at 360px, 430px, and desktop:
  - Beranda trend and Analitik charts render with solid fills, readable axes/legends, and working tooltips.
  - No label truncation or layout shift in the 5-slot mobile bar area.
  - Login, transactions, wallets, hutang, copilot, settings, and error states look consistent and remain fully usable.
  - Reduced-motion mode removes decorative animation without breaking layout or charts.

## Acceptance Criteria

- Exactly one new runtime dependency: `layerchart`. No full UI-system dependency is added.
- Every listed route surface is visually improved with no route/behavior/copy/validation/data change.
- No gradients in new/edited app code: `Gradient`, `linear-gradient`, and `radial-gradient` do not appear in chart/fill/style code paths.
- Charts have solid fills, dark-mode parity, tooltips plus textual legends/lists, and reduced-motion-safe behavior.
- Home trend data comes from existing `getMonthlyTotals(db, 6)`; analytics keeps using its existing load fields.
- `npm run check`, `npm run test`, and `npm run build` are all green.

## Verification / Tests

- `npm run check` — TypeScript strict + Svelte, 0 errors.
- `npm run test` — Vitest suites remain green; no new server unit tests required because no money-path logic changes.
- `npm run build` — required because this adds a client dependency and charts.
- Manual verification matrix in Task 5.3 (light/dark × 360px/430px/desktop × reduced motion).

## Git

- Branch: `feature/ui-visual-overhaul`
- Suggested commits:
  1. `feat(deps): add layerchart and home monthly trend data`
  2. `feat(ui): no-gradient shared visual foundation`
  3. `feat(dashboard): layerchart trend and analytics visual upgrade`
  4. `feat(ui): polish remaining routes presentation-only`
  5. `chore(verify): check, tests, and build green`

## Deployment

No schema change, no migration, no D1 `--remote` step, no secrets change. Normal push to `main`; Workers Builds auto-deploys after merge.

## Integration Notes

- Do **not** start this branch until sibling plans `debt-delete-with-payments.md` and `mobile-bottom-nav-sheet.md` are merged through `/integrate`.
- Branch from updated `main` after that integration.
- Expected overlap with already-merged sibling work: `src/routes/hutang/+page.svelte`, `src/routes/hutang/+page.server.ts`, `src/lib/components/Navigation.svelte`, `src/lib/components/ModalShell.svelte`, `src/routes/+layout.svelte`, `docs/data-model.md`, docs/plan tracking.
- Conflict rule: keep sibling behavior/logic intact; apply only visual layering on top. If a visual change would alter sibling behavior, drop the visual change and note it in the merge.
- `package.json`/`package-lock.json` are newly touched here; siblings do not add dependencies, so lockfile conflicts should be limited to version drift—resolve by keeping `main` then re-running the Task 1 install if needed.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1. Dependency + home trend data | builder | - | Inline: package install plus one server-load change and immediate `check` |
| 2. Shared no-gradient foundation | designer | - | Inline: single-file `app.css` ownership avoids token drift |
| 3. Beranda + Analitik charts/pages | designer | B | Route-file-only work; frozen tokens/data from steps 1–2 |
| 4. Remaining routes polish | designer | B | Disjoint route files from step 3; same frozen foundation |
| 5. Diff + acceptance review | reviewer | - | Read-only; checks no-gradient rule, a11y, and behavior preservation |

- Steps 1 → 2 are sequential: charts/pages depend on installed API/data plus frozen visual tokens.
- Batch B = steps 3 + 4 in one message only after steps 1–2 are complete; both batches must edit route files only, never shared components.
- Reviewer owns final verification of gradient absence, dark-mode parity, reduced-motion behavior, and the manual matrix.
