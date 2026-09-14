# Implementation Plan: Template-Driven Catppuccin UI

## Objective

Implement the checked-in `template-design/` basis onto the app: DESIGN tokens
(`template-design/catppuccin_latte_fintech/DESIGN.md`) plus the three localized
screens (`beranda_*`, `transaksi_*`, `analitik_*` `*_template_style/`), treated
as the brief. Mode is **Operate**: scanability and consistency outrank
expression. Per impeccable, the brief wins over current-code habits — where
template and incumbent disagree, the template wins except for the locked repo
rules listed under Conflicts (resolved below with recommendations).

## Scope

In:

- Token roles from DESIGN.md §Colors (peach `#fe640b`, blue `#1e66f5`, green
  `#40a02b`, red `#d20f39`, base `#eff1f5`, mantle `#e6e9ef`, crust `#dce0e8`,
  text `#4c4f69`, muted overlay0 `#8c8fa1`, border surface0 `#ccd0da`) mapped
  onto the existing `ctp-*` Tailwind theme (values already match; this step
  locks *semantics*, not values).
- Screen implementations per the Surface Map below (dashboard, transactions,
  analytics first; hutang/copilot/settings/wallets/login follow the same
  component language, no layout reinvention).
- Signature surfaces: lavender hero card, dark "Ringkasan" summary card (dark
  in both modes), dark floating mobile nav with orange Catat FAB, segmented
  Pemasukan/Pengeluaran control, tinted circular txn icons (income green /
  expense red / transfer BLUE per DESIGN.md — this replaces the current
  neutral transfer treatment).
- Type scale + tabular IDR (`tnum`, `Rp ` prefix with spacing) per DESIGN.md
  §Typography; radii (cards 12px, controls 8px, icons circular) and
  elevation Layers 0-2 per DESIGN.md.
- Stale `docs/architecture.md` visual-layer paragraph + stale `docs/index.md`
  plan reference.

Out:

- New routes, new data flows, new dependencies, money/SQL/validation/auth/AI
  logic. UI classes + `format.ts` IDR spacing only.
- Copying template code verbatim (Tailwind-CDN arbitrary values, Material
  Symbols, inline SVGs) — translate into repo utilities (`.card/.btn/.input/
  .chip/.label/.list/.tile`) and Lucide icons.
- The English `*_reference_template/` screens are fallback only (composition
  ideas); the localized `*_template_style/` trio is authoritative.

## Context

Stack: SvelteKit 2 + Svelte 5 runes, Tailwind 4 (no config, `@theme` ctp-*
tokens + class-based `dark`), one Worker + D1, LayerChart via
`.lc-root-container` vars. Verification `npm run check && npm run test`;
routes verified manually. Mutations via form actions + `invalidateAll()`
(except copilot fetch). Balances computed, SQL in `db.ts`, server zod only.

Surface Map (template → route):

| Template | Route | Key elements to implement |
|---|---|---|
| `beranda_digital_wallet_template_style/` | `src/routes/+page.svelte` | Greeting header; hero card (balance + CTA, see Conflicts); 4 quick-action tiles; Hutang/Piutang split card (red/green); recent-expense list w/ tinted circular icons + right meta; budget bar card |
| `transaksi_transfer_template_style/` | `src/routes/transactions/+page.svelte` | Segmented Pemasukan/Pengeluaran (dark pill active); month total; summary card w/ mini day-bars (peak highlighted + tooltip chip); quick-transfer-style summary card; history list w/ `+`/`-` signed tabular amounts |
| `analitik_anggaran_template_style/` | `src/routes/analytics/+page.svelte` | Account/wallet picker card; dark summary card w/ donut + 4-way legend; budget card w/ progress bar + `% Terpakai` green chip + condition line; 2-col category grid (tinted icon, count pill, total) |
| DESIGN.md (all sections) | `src/app.css` + all components | Roles, type scale, radii, elevation, buttons/inputs/chips/checkboxes/rows |
| English reference trio | fallback | Composition only when a `_style` screen is silent |

Prior audit (2026-09-14, still valid for non-template routes): `text-white`
on light peach/green fills, `login:13` inverted `bg-ctp-crust`, neutral
transfer treatment, 3-warm-hue donut, flat-gray wallet bars, chip ring drift,
tile-size drift, `architecture.md:125` + `index.md:23` stale entries.

Conflicts (template vs locked repo rule → resolution):

1. Template hero uses indigo→lavender **gradient**; repo rule is solid fills
   only → **solid hero** in the template's lavender/blue family
   (`ctp-lavender/ctp-blue`), white large-display text (3:1 large-text bar).
2. Template indigo `#6366f1/#4f46e5` and amber `#f7b75b/#f5a97f` are NOT
   Catppuccin → map to `ctp-lavender`/`ctp-blue` and `ctp-peach`/`ctp-yellow`.
3. Template buttons peach bg + white text stand (brief wins; bold 14px+
   control labels). Keep hover `#f75b02` + bevel.
4. Template inputs `bg #ffffff` (light) → adopt for `.input` light mode (dark
   stays `ctp-surface0`); focus = peach border + `rgba(254,100,11,.15)` glow;
   pin `Rp` prefix in currency inputs.
5. Templates are light-only → dark (Mocha) mirrors existing structure (page
   crust, card base); the dark summary card and dark nav render dark in BOTH
   modes (signature surfaces, fixed colors, not theme-swapped).
6. `impeccable context` launcher could not run in planning (restricted shell);
   builder should attempt it before editing; on failure proceed — this plan
   carries the brief inline.

## Dependencies

None. No schema/packages/env change, no sibling plans (`plan/` holds only
this file). Foundation step blocks the sweep steps (ordered below).

## Files / Areas Likely Affected

- `template-design/` — READ-ONLY reference. Never edited, never imported.
- `src/app.css` — roles, type scale (`currency-display` etc.), radii,
  elevation Layers 0-2, `.btn/.input/.chip` restyle to DESIGN.md, focus glow.
- `src/routes/+page.svelte`, `transactions/+page.svelte`,
  `analytics/+page.svelte` — the three template screens.
- `src/routes/hutang/`, `wallets/`, `copilot/`, `settings/`, `login/` +
  `Navigation/ModalShell/Toast/TransactionForm/WalletSelect/ConfirmModal` —
  same component language (tinted circular icons, blue transfer, chips,
  dark-pill segmented where applicable); mobile nav → dark floating pill +
  orange Catat FAB per beranda template (desktop sidebar keeps structure,
  adopts roles).
- `src/lib/format.ts` — `Rp` prefix spacing (`Rp 14.850.000`), tabular output.
- Docs: `docs/architecture.md` visual-layer paragraph,
  `docs/index.md` approved-plans entry.
- Untouched: `src/lib/server/*`, `hooks.server.ts`, `schema.sql`,
  `migrations/`, `wrangler.jsonc`, `static/`, `template-design/`.

## Implementation Steps

1. **Template gap audit (read-only).** Diff each of the 3 routes + shared
   components against its template screen + DESIGN.md section; output a
   per-surface gap list (tokens, radii, type, components). Confirms the
   Conflict resolutions above or escalates with evidence.
2. **Foundation in `src/app.css` + `format.ts`.** Lock roles (incl. transfer
   blue, signature dark surfaces), type scale + `tnum`, radii, elevation,
   button/input/chip/checkbox restyle, focus glow, `Rp ` spacing. Fix
   `login:13` bg (`ctp-crust` → `ctp-base` light).
3. **Beranda + Transaksi sweep.** Dashboard hero (solid lavender/blue), quick
   actions, liability split card, expense list, budget bar; transactions
   segmented control, summary mini-bars, history list w/ signed amounts.
   Includes dark floating mobile nav + Catat FAB.
4. **Analytics + component sweep.** Dark summary donut + legend, budget card,
   category grid; propagate icon/chip/button language to hutang, wallets,
   copilot, settings; LayerChart palettes aligned (donut ≥4 distinct hues,
   green reserved income, swatches match slices).
5. **Docs + verify.** Rewrite `architecture.md` visual-layer paragraph to the
   template roles; point `docs/index.md` at this plan; `npm run check &&
   npm run test`; manual 8-route light+dark sweep + side-by-side fidelity
   check vs the 3 `screen.png` files (composition, not pixels).

## Acceptance Criteria

- Each of the 3 routes recognizably implements its template screen (hero,
  quick actions, segmented control, dark summary card + donut legend, budget
  bar, category grid, dark nav + orange FAB).
- Palette limited to DESIGN.md §Colors (+ fixed dark signature surfaces);
  indigo/amber template hexes gone; no gradients; no non-ctp palette
  utilities in `src/**` (allowed: `shadow-black/5` tint).
- Transfer affordances blue-tinted everywhere (tiles, chips); income green,
  expense red; donut legible at 8+ categories.
- Amounts tabular with `Rp ` spacing; cards 12px / controls 8px / icons
  circular; focus glow on inputs.
- `docs/architecture.md` describes template roles; `docs/index.md` references
  this plan, not the missing `ui-deslop-pages` file.
- `npm run check && npm run test` green; 8-route light+dark manual sweep done.

## Verification / Tests

- `npm run check` + `npm run test` (no new tests; UI-class-only + format
  spacing — extend `format` assertions only if output shape changes).
- Manual: 8 routes × light/dark × mobile/desktop; `prefers-reduced-motion`;
  fidelity pass against the 3 `screen.png` + DESIGN.md sections; donut at
  1/4/8+ categories.
- Forbidden: live-D1 checks; screenshots-as-proof alone without the class +
  token inspection behind them.

## Git (branch: feature/ui-catppuccin-operate)

Branch from updated `main`. Single sequential plan — builder may merge inline
once green. Keep the diff UI-only (+2 doc paragraphs); `template-design/`
untouched.

## Integration Notes (merge order vs sibling plans, likely file overlaps)

No siblings. Internal overlap risk: steps 3 and 4 both read `app.css` roles
but edit disjoint surfaces (beranda+transactions vs analytics+components) —
parallel-safe after step 2. If a new plan touching `app.css`/route classes
appears mid-flight, this plan merges first (foundation owns `app.css`).

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 | reviewer | A | Read-only template gap audit; parallel-safe, needs no context |
| 2 | builder | - | Inline: central foundation (app.css + format.ts + login bg); blocks 3-4 |
| 3 | designer | B | Beranda + Transaksi screens + mobile nav; disjoint from step 4, needs step 2 |
| 4 | designer | B | Analytics + shared-component propagation; disjoint from step 3, needs step 2 |
| 5 | builder | - | Inline: docs + full verify + fidelity pass; synthesizes 3-4 |

Batch A = step 1 alone (may start immediately). Batch B = steps 3+4 in one
message after step 2 lands. Dependencies: 2 ← 1 (audit informs; DESIGN.md
values in Context allow starting); 3,4 ← 2; 5 ← 3,4. Builder collects both
B batches, resolves overlap (none expected), runs check + tests + manual sweep.
