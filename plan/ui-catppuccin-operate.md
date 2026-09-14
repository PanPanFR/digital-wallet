# Implementation Plan: Catppuccin Operate Cleanup

## Objective

Make the UI honestly Catppuccin and remove the visual slop, keeping the current
layout and product behavior. Mode is **Operate** (visitor completes a task):
scanability, consistency, and contrast outrank expression. The brief (Catppuccin
Latte/Mocha tokens already in `src/app.css`) wins — this is a refinement, not a
redesign; the incumbent identity stays.

## Scope

In:

- Semantic color roles fixed to Catppuccin tokens (brand / income / expense /
  warning / info / neutral) + a colored-fill text rule that passes WCAG AA.
- Contrast fixes on every white-on-color fill in light mode (hero, buttons,
  toasts, chat bubbles, login tile).
- Depth / radius / type-scale consistency (one rule each, enforced via the
  existing `.card` / `.chip` / `.tile` / `.btn` / `.input` utilities).
- Chart palettes that stay distinguishable past 3 categories without stealing
  the income/expense meanings.
- Navigation active-state affordance beyond color alone.
- Stale `docs/architecture.md` visual-layer paragraph + stale
  `docs/index.md` plan reference (see Context).

Out:

- Any layout restructuring, new routes, new components, new dependencies.
- New `PRODUCT.md` / `DESIGN.md` — the incumbent implementation is the source
  of truth (none exist in repo; refinement proceeds on current code).
- Touching money logic, SQL, validation, auth, AI provider code. UI classes
  only (plus the two doc paragraphs above).

## Context

Stack: SvelteKit 2 + Svelte 5 runes, Tailwind 4 (no config file, `@theme`
tokens + class-based `dark` variant), one Cloudflare Worker + D1, LayerChart
(`layerchart/svg`, themed via `.lc-root-container` vars in `src/app.css`, no
library theme CSS). UI copy Indonesian, code/docs English. Verification is
`npm run check && npm run test`; route behavior is verified manually.
Conventions: mutations via form actions + `invalidateAll()` (except copilot
`fetch` to `/api/ai/report`); balances computed, never stored; all SQL in
`src/lib/server/db.ts`; zod validation server-side only.

Key findings (evidence, all read 2026-09-14):

1. Token values ARE correct Catppuccin (Latte defaults + Mocha `html.dark`
   overrides, `src/app.css:9-66`). The "aneh" is semantic misuse, not the
   palette: `text-white` on light-mode Latte peach/green fills fails WCAG AA
   (peach `#fe640b` / green `#40a02b` vs white ≈ 3:1). Affected:
   `src/routes/+page.svelte:103,107` (hero), `src/app.css:104,110`
   (`.btn-primary`, `.btn-danger`), `src/lib/components/Toast.svelte:12-13`,
   `src/routes/copilot/+page.svelte:153`, `src/routes/login/+page.svelte:16`.
   Dark-mode counterparts already use `text-ctp-crust` (correct) — the bug is
   light-mode-only. Contrast with `Navigation.svelte:45`, which correctly uses
   `bg-ctp-peach text-ctp-crust` in both modes.
2. `src/routes/login/+page.svelte:13` renders `bg-ctp-crust` (near-black) in
   light mode — inverted page background, should be `bg-ctp-base`.
3. `docs/architecture.md:125` still describes the pre-Catppuccin world
   ("single orange-600 brand accent, emerald income, sky digital kind, amber
   cash kind, neutral slate transfers"). Code uses `ctp-green/red/peach`, and
   dashboard kind tiles both render neutral `surface0/subtext1`
   (`src/routes/+page.svelte:115,125`) — the documented sky/amber kind
   distinction does not exist. Doc paragraph must be rewritten to the roles
   this plan locks in.
4. `docs/index.md:23` references `plan/ui-deslop-pages.md`, but `plan/` is
   empty — stale entry; update it to this plan as part of the doc touch-up.
5. Analytics donut cycles 3 warm hues (`red/peach/maroon`,
   `src/routes/analytics/+page.svelte:108-113`) — indistinguishable past 3
   categories and red already means expense. Wallet bars use flat
   `overlay0` gray (`analytics:209`) — dead, no hierarchy.
6. Chip/depth/type drift: status chips mix `ring-1 ring-inset` and ringless
   (`hutang:326` vs `hutang:312-320`); `ModalShell` stacks `shadow-lg` over
   `.card`'s `shadow-sm` (acceptable only as the overlay exception — codify
   it); tile sizes overridden per page (`h-6/h-9/h-10/h-12`); KPI numerals
   jump `text-lg` → `text-2xl font-extrabold` (`hutang:209,238`).
7. `impeccable context` launcher could not run in the planning session
   (restricted shell); builder should attempt
   `.opencode/skills/impeccable/scripts/impeccable.cmd context` (or
   `impeccable` on sh) before editing and, if it fails, note it and proceed
   on this plan — the plan carries the full Operate brief inline.

## Dependencies

None. No schema change, no new packages, no env/secret change, no sibling
plans (plan/ is empty). Foundation step must land before the sweep steps
within this plan (ordered below).

## Files / Areas Likely Affected

- `src/app.css` — semantic role comments, colored-fill text rule,
  depth/radius/type codification (no new utilities unless a gap is proven;
  reuse `.card/.btn/.input/.chip/.label/.list/.tile`).
- Components: `Navigation.svelte` (active affordance), `Toast.svelte`
  (fills/text), `ModalShell.svelte` (overlay-depth rule),
  `TransactionForm.svelte` + `hutang/+page.svelte` (type/direction toggle
  parity), `ConfirmModal` / `WalletSelect` / `ThemeToggle` (verify-only;
  `ThemeToggle` meta hex already matches tokens).
- Routes: `+page.svelte` (hero), `login` (page bg), `transactions` + `wallets`
  (filter/preset chip parity), `analytics` (donut + wallet palettes),
  `hutang` (progress-bar-by-status, chip-ring parity), `copilot` (user bubble
  text), `settings` (verify-only; alert patterns already consistent).
- Docs: `docs/architecture.md` visual-layer paragraph, `docs/index.md`
  approved-plans entry.
- Explicitly untouched: `src/lib/server/*`, `src/hooks.server.ts`,
  `schema.sql`, `migrations/`, `wrangler.jsonc`, `static/`.

## Implementation Steps

1. **Contrast + inventory audit (read-only).** Confirm each failing
   white-on-color pair with a contrast tool (AA: 4.5 normal / 3.0 large),
   list every radius/shadow/type outlier vs the `.card/.chip/.tile` baseline.
   Output: short finding list consumed by steps 2-4.
2. **Foundation in `src/app.css`.** Lock the role table (brand peach, income
   green, expense red, warning yellow, info sky/sapphire, neutral
   surface+subtext), the colored-fill text rule (no `text-white` on light
   peach/green; verify each pair), the depth rule (page surfaces use `.card`
   depth only; `shadow-lg` reserved for overlay surfaces: modal, sheet,
   toast), chip-ring parity (all status chips ringed or all plain — one
   rule), tile-size scale. Fix `login` page bg (`ctp-crust` → `ctp-base` in
   light) and `app.html` body pairing if it breaks the page/card step.
3. **Component sweep.** Apply roles + text rule to Navigation (add
   non-color active affordance, e.g. indicator/pill weight), Toast, Modal
   variants, TransactionForm toggles; verify ConfirmModal/WalletSelect/
   ThemeToggle unchanged-or-trivial.
4. **Route sweep.** Hero, filter/preset chips, analytics palettes (donut:
   ≥4 distinguishable hues, green reserved for income, swatches match slices
   exactly; wallet bars: single brand hue or per-wallet distinct — pick one),
   hutang progress-by-status + chip parity, copilot bubble text.
5. **Docs + verify.** Rewrite the `architecture.md` visual-layer paragraph to
   the locked roles; point `docs/index.md` at this plan; run
   `npm run check && npm run test`; manual light+dark sweep of all 8 routes
   (dashboard, transactions, wallets, hutang, analytics, copilot, settings,
   login) checking contrast, active states, charts with 1 / 4 / 8+ categories.

## Acceptance Criteria

- Zero `text-white`/`bg-white` on colored fills in light mode; every
  fill/text pair passes AA (spot-check hero, both button variants, toast
  success/error, user bubble, login tile).
- `src/**/*.svelte` contains no non-Catppuccin palette utilities
  (`slate/gray/emerald/sky/amber/...`); no gradients; only allowed exception
  is the existing `shadow-black/5` elevation tint.
- Donut legible with 8+ categories; wallet chart not flat gray; hutang
  progress color reflects status; chips/rings/tiles follow the step-2 rules.
- Active nav identifiable with color removed (grayscale check).
- `docs/architecture.md` describes the locked roles; `docs/index.md` no
  longer references the missing `ui-deslop-pages` file.
- `npm run check && npm run test` green; manual 8-route light+dark sweep done.

## Verification / Tests

- `npm run check` (svelte-check, TS strict) + `npm run test` (vitest, fake-Db
  suites) — no new tests expected (UI-class-only change; no suite covers
  rendered classes).
- Manual: 8-route sweep in light + dark, mobile (bottom nav + sheet) +
  desktop (sidebar), `prefers-reduced-motion` on; contrast tool for the
  five fill/text pairs; donut with 1/4/8+ categories.
- Forbidden: live-D1 checks, `wrangler dev` screenshots-as-proof alone;
  class inspection + contrast numbers are the evidence.

## Git (branch: feature/ui-catppuccin-operate)

Branch from updated `main`. Single sequential plan — builder may merge inline
once green (no sibling plans to order). Keep the diff UI-only; docs edits ride
in the same branch.

## Integration Notes (merge order vs sibling plans, likely file overlaps)

No siblings (`plan/` empty at write time). Only overlap risk is internal:
steps 3 and 4 both read `app.css` roles but edit disjoint file sets
(components vs routes) — safe to parallelize after step 2 lands. If a new
plan appears touching `app.css` or route classes mid-flight, this plan merges
first (foundation owns `app.css`).

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 | reviewer | A | Read-only contrast + inventory audit; parallel-safe, needs no context |
| 2 | builder | - | Inline: central 1-file foundation + login bg; needs current context, blocks 3-4 |
| 3 | designer | B | Component sweep; disjoint files from step 4, needs step 2 roles |
| 4 | designer | B | Route sweep; disjoint files from step 3, needs step 2 roles |
| 5 | builder | - | Inline: docs touch-up + full verify; trivial, synthesizes 3-4 |

Batch A = step 1 alone (may start immediately). Batch B = steps 3+4 dispatched
in one message after step 2 lands. Dependencies: 2 ← 1 (audit informs, but
known fixes in Context may start without blocking); 3,4 ← 2; 5 ← 3,4.
Builder collects both B batches, resolves any class overlap (none expected),
then runs check + tests + the manual sweep itself.
