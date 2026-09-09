# Implementation Plan: ui-redesign — Full UI/UX Overhaul (Digital Wallet)

Status: Approved by user (design locked 2026-09-09)
Branch: `feature/ui-redesign`
Plan file: `plan/ui-redesign.md`

## Objective

Overhaul the entire front-end visual layer of the Digital Wallet app from flat, undifferentiated Tailwind utility soup into a cohesive, disciplined design system: semantic color tokens, shared component classes, refined per-page layouts, polished empty/loading/error states, subtle motion, and consistent light+dark themes. **Zero behavior, data-model, route, or server changes.**

Design direction (user-approved):
- "B dengan disiplin A": consumer e-wallet character (like GoPay/DANA/ShopeePay) with the discipline of Linear/Stripe token systems.
- **Brand accent: flat `orange-600` (#ea580c).**
- **Forbidden:** gradients anywhere, emoji/emoticon characters, glassmorphism, glow effects, decorative ornament, rainbow charts. All icons = Lucide (already used).
- Elevation via hairline borders + tiny shadows, not big shadows (Linear rule).
- Small, consistent radii: cards ≤ `rounded-xl` (12px), controls `rounded-lg` (8px), pills `rounded-full`. No 16px+ card radius.
- Chromatic color only for data semantics, never for body copy. Body text stays in the slate neutral scale.
- Type: **Plus Jakarta Sans** (self-hosted via `@fontsource-variable/plus-jakarta-sans`), numbers `tabular-nums`, no heavy 700 weight except large balances.
- Motion minimal and `prefers-reduced-motion`-safe.

Reference sources (used during design; tokens already distilled below, no re-fetch needed to execute):
- https://www.designmd.supply/guides/coinbase.com (consumer fintech: flat single accent)
- https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b0d1 (Linear DESIGN.md: border-not-shadow, radii, single-accent, no-gradient rules)
- https://www.designmd.supply/guides/stripe.com and https://designmd.me/ (DESIGN.md token format; discipline reference)

## Scope

### In scope (visual layer only)
- `src/app.css` (design tokens, base layer, component utilities)
- `src/app.html` (theme-color meta, font, body classes)
- All page `.svelte` under `src/routes` (markup/classes only; keep every `<form>` action, `name`, `use:enhance`, method, href, and handler intact)
- All shared components in `src/lib/components/*.svelte`
- `package.json` / `package-lock.json` (+ `@fontsource-variable/plus-jakarta-sans`)
- Optional/best-effort brand color in `static/manifest.json` theme_color and `static/icon.svg` if trivially editable; **skip** PNG icon regeneration (`static/icons/*`) — out of scope, no image tooling.

### Out of scope (do NOT touch)
- `src/lib/server/**`, `src/hooks.server.ts`, all `+server.ts`, `src/lib/constants.ts` (no new icon component map there — see reason below), `src/lib/stores.svelte.ts`, `src/lib/modalAccessibility.ts`, `src/lib/format.ts`
- `schema.sql`, `migrations/`, `wrangler.jsonc`, `.dev.vars`, any DB/API/auth/AI logic
- Feature behavior, form action names, URL params, validation rules, route paths, page IDs/names
- No new runtime dependency other than the fontsource package. No chart library (charts stay hand-rolled DOM/SVG).

Note on category icons: `constants.ts` is imported by server modules (`validation.ts`, `ai.ts`); importing Lucide components into it would break that boundary. Category icon/color maps live **locally in each page** that needs them (dashboard + transactions only).

## Context (current state — verified 2026-09-09)

Stack: SvelteKit 2 + Svelte 5 (runes) + Tailwind CSS v4 (`@tailwindcss/vite`) + lucide-svelte + Cloudflare Workers (adapter-cloudflare) + D1.

- `src/app.css` is only: `@import 'tailwindcss'; @custom-variant dark (&:where(.dark, .dark *));`
- Every page is a list of repeated raw utility strings: cards are `rounded-xl border border-gray-200 bg-white p-4/5 dark:border-gray-800 dark:bg-gray-900`; inputs `rounded-lg border px-3 py-2 bg-white dark:bg-gray-950 …`; primary buttons `bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium`.
- One accent `sky-600` does brand/active/links/chips/transfer simultaneously; `indigo` marks "digital" wallet kind and some icons; `emerald` marks both income AND "cash" kind (double-green confusion in rows); `red` = expense/debt/danger.
- Numbers use `font-mono`; page background `bg-gray-50 dark:bg-gray-950` on `<body>` in `app.html`; theme-color meta `#0ea5e9`; dark theme via `.dark` class + `dark:` variants.
- Empty states are dashed-border one-liners; no motion anywhere; `✕` glyph used in some modals vs Lucide `X` icon in others (unify on Lucide `X`).

Surface area (files to restyle):
- Pages: `src/routes/+page.svelte` (home/dashboard), `+error.svelte`, `login/+page.svelte`, `transactions/+page.svelte`, `wallets/+page.svelte`, `hutang/+page.svelte`, `analytics/+page.svelte`, `copilot/+page.svelte`, `settings/+page.svelte`
- Shared: `src/lib/components/Navigation.svelte`, `TransactionForm.svelte`, `ConfirmModal.svelte`, `Toast.svelte`, `ThemeToggle.svelte`, `Skeleton.svelte`
- Global: `src/app.css`, `src/app.html`, `package.json`, `package-lock.json`

## Design System Specification

### Semantic color roles (source of truth for every edit)

| Role | Light classes | Dark classes | Used for |
|---|---|---|---|
| Brand fill / primary CTA | `bg-orange-600 text-white hover:bg-orange-700` | same | Logo tile, primary buttons, active filter chips, send button, hero panel |
| Brand tint (active pills) | `bg-orange-50 text-orange-700` | `dark:bg-orange-950 dark:text-orange-400` | Sidebar active item, tinted chips |
| Brand text links on white | `text-orange-700 hover:text-orange-800` | `dark:text-orange-400 dark:hover:text-orange-300` | "Lihat semua", "Reset", inline links (orange-600 fails 4.5:1 on white — text uses 700) |
| Focus ring | `focus-visible` orange outline (base layer) | same | Keyboard focus everywhere |
| Income / piutang / lunas / success | `emerald-600` text, `emerald-500` fill, `emerald-50` tint | `emerald-400` / `emerald-500` / `emerald-950` | `+` amounts, bars, badges, toasts |
| Expense / hutang (owe) / delete / error | `red-600` text, `red-500` fill, `red-50` tint | `red-400` / `red-500` / `red-950` | `−` amounts, bars, badges, destructive buttons |
| Wallet kind — digital | `sky-500` icons; chips `bg-sky-50 text-sky-700` | `dark:bg-sky-950 dark:text-sky-400` | Smartphone icon, digital chips/cards |
| Wallet kind — cash | `amber-500` icons; chips `bg-amber-50 text-amber-700` | `dark:bg-amber-950 dark:text-amber-400` | Banknote icon, cash chips/cards |
| Transfer (type=transfer) | neutral `bg-slate-100 text-slate-600` | `dark:bg-slate-800 dark:text-slate-300` | Transfer badge/arrow (money moved, not gained) |
| Neutrals | slate scale (migration map below) | slate scale | Text, borders, surfaces, dividers |

Pairing rule for cash-amber vs brand-orange: cash is always a soft tint + icon (amber-50/500); brand is always a solid fill or orange-700 text link. No hue-only distinction for meaning without a label/icon (a11y).

### Dark theme
Keep current pattern: `.dark` class on `<html>`, `dark:` variants, body `dark:bg-slate-950`. Cards `dark:bg-slate-900` with `dark:border-slate-800`; hover surfaces `dark:hover:bg-slate-800`. Canvas stays clearly darker than cards (surface ladder: canvas darkest, card one step up, hover one more). No glows; rely on borders.

### Type
- Add dependency `@fontsource-variable/plus-jakarta-sans` (regular dependency) and import it **first** in `src/app.css`.
- Tailwind v4 font override in `@theme`: `--font-sans: 'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;` (makes default `font-sans` everywhere).
- All money amounts: replace `font-mono` with `tabular-nums` (keep size/weight).
- Weight discipline: body 400/500; small labels 500; headings `font-semibold`; `font-bold` only on hero/large balances. No `font-bold` on `text-sm` metadata.

### Component utilities (add to `src/app.css`, `@layer components`)

Use Tailwind v4 `@apply` of built-in utilities only (custom classes cannot `@apply` each other). Names/API fixed; exact inner classes may be tuned by the designer but must use the semantic colors above.

```css
@layer components {
  .card { @apply rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900; }
  .btn { @apply inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600; }
  .btn-primary { @apply bg-orange-600 text-white hover:bg-orange-700; }
  .btn-outline { @apply border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800; }
  .btn-danger { @apply bg-red-600 text-white hover:bg-red-700; }
  .btn-ghost { @apply text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800; }
  .input { @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-offset-1 focus:outline-orange-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500; }
  .chip { @apply inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium; }
  .label { @apply mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300; }
}
```

Note: Tailwind v4 includes `shadow-xs` natively. `@apply` with `dark:` variants works in v4. Pages then sweep repeated raw patterns to use these classes; spacing stays inline.

### Base layer (add to `src/app.css`)
- `@theme` block: font override.
- Global focus-visible: `:focus-visible { outline: 2px solid var(--color-orange-500); outline-offset: 2px; }` (component classes may override).
- `::selection` tint (orange, both themes via plain CSS + `html.dark` selector).
- Reduced motion: `@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`
- Keep `@custom-variant dark`.

### Checkboxes
Replace `text-sky-600` on checkboxes with `accent-orange-600` (Tailwind v4 accent utilities). Keep size/border classes.

### Motion (subtle, tasteful)
- Modal open: small scale+fade on the dialog panel (Svelte transition, ~120–160ms), backdrop fade. Svelte JS transitions use `reducedMotion` from `svelte/transitions`.
- Toast: slide-in from edge. List rows: optional mount fade; never fade whole lists that re-mount on navigation/data refresh (Skeleton already covers that state).
- Hover: `transition-colors` on buttons/rows/chips/links; optional `active:scale-[0.98]` on `.btn-primary` only. No bounce/spring/glow.

## Color & class migration map (mechanical, but classify by role — never blind find/replace)

### A. Neutral gray → slate (all files, same lightness)
`gray-50→slate-50`, `gray-100→slate-100`, `gray-200→slate-200`, `gray-300→slate-300`, `gray-400→slate-400`, `gray-500→slate-500`, `gray-600→slate-600`, `gray-700→slate-700`, `gray-800→slate-800`, `gray-900→slate-900`, `gray-950→slate-950`. Applies to `divide-gray-*`, `border-gray-*`, `bg-gray-*`, `text-gray-*`, `placeholder:`.

### B. Brand: old `sky-*` acting as brand/action/link/active → orange, EXCEPT sky used for digital-kind (map C). Classify each occurrence:
- Buttons/logo tile/send/filter-chip-active `bg-sky-600 … text-white` → `bg-orange-600 hover:bg-orange-700`
- Text links `text-sky-600 hover:underline dark:text-sky-400` → `text-orange-700 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300`
- Active nav item / active chip tint `bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400` → orange equivalents
- Copilot suggestion chips (sky tints) → orange equivalents
- Focus rings `focus:ring-sky-500` → covered by base/`.input` outline classes
- Passive section header icons previously sky (e.g., Wallet icon next to "Saldo Bersih") → neutral `text-slate-400`; brand-identity accents (Copilot title Sparkles, hero) → orange.

### C. Wallet-kind colors:
- "digital" indicators currently `indigo-*` (`text-indigo-500` Smartphone, chips `bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400`) → **sky** equivalents.
- "cash"/tunai indicators currently `emerald-*` where they mean *kind* (`text-emerald-500` Banknote icons, cash chips) → **amber** equivalents. IMPORTANT: emerald that means income/lunas/success stays emerald. Disambiguate by adjacent label/icon: Banknote icon + "Tunai" heading + wallet chip next to wallet name = kind → amber; `+`/`Pemasukan`/`Piutang`/`Lunas`/success toast = income → keep emerald.
- Transfer badges (`→ dest_wallet`) currently sky → neutral `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`.
- Hutang direction badge: owe stays red; owed currently sky → **emerald** (matches "Piutang Saya" emerald semantics; no collision now because cash-kind is amber).

### D. Type
- Money/number text: `font-mono` → `tabular-nums` everywhere (dashboard balances, subtotal cards, wallet balances, transaction amounts, debt remaining, analytics values).
- Remove `font-bold` from `text-sm`/`text-xs` metadata where it was only emphasis; keep semibold/bold on figures.

### E. Misc
- Replace stray `✕` close glyphs with Lucide `X` (ConfirmModal, hutang dialogs, wallets adjust dialog, Toast).
- Dialogs `rounded-2xl` → `rounded-xl` (uniform ≤12px rule).
- Body/page backgrounds → slate (app.html).

## Per-area guidance

### app.css / app.html
See Design System + migration. app.html: `theme-color` `#ea580c`; body `bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100`; pre-paint theme script untouched.

### Navigation (shared)
- Sidebar: logo tile flat `bg-orange-600` `rounded-lg`, Wallet icon white; wordmark `font-semibold`.
- Active item: orange tint pill (`bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400`) `font-medium`; inactive slate.
- Footer: ThemeToggle + logout ghost-style; logout hover red tint (keep semantic). Sidebar width `w-56` may stay — if changed to `w-60`, update `md:pl-56` → `md:pl-60` in `+layout.svelte` together.
- Mobile bottom nav: active orange-600 icon + `font-semibold` label; inactive slate; keep 7 items/order/hrefs, safe-area padding preserved.

### Dashboard (+page.svelte) — flat hero upgrade
- Replace the white "Total Saldo" card with a **flat solid `bg-orange-600` hero panel** (`rounded-xl`, `p-5/6`): label small `text-white/80` ("Total Saldo" + Wallet icon), balance `text-3xl font-bold tabular-nums text-white`. No gradient/pattern/glow. Keep header row (month picker + "Catat") as a normal page row above the hero so inputs stay light.
- Digital vs Tunai subtotal cards: `.card` with colored icon tile — sky (Smartphone) / amber (Banknote); amounts `tabular-nums`, icon-tinted coloring.
- Saldo Bersih + Hutang/Piutang summary: `.card` with neutral icon, arrow affordance slate.
- Wallet list grouped Digital/Tunai: each wallet row gets a colored icon/avatar tile (sky/amber); balance `tabular-nums`.
- Recent transactions: leading category icon tile (local map in page, colors muted) or kind tile; wallet chip in kind colors; `+`/`−` amounts; transfer neutral. Empty state upgraded (icon + title + hint).
- Keep the `navigating` + Skeleton pattern.

### Transactions
- Toolbar: filters into compact control group using `.input` classes + segmented chips Semua/Digital/Tunai (active solid orange, inactive neutral chip); month/search/category styled.
- Rows: checkbox (keep bulk-select), content (desc + meta: category · date, wallet chip kind-color, transfer badge neutral), amount `tabular-nums`, edit/delete ghost buttons; `hover:bg-slate-50 dark:hover:bg-slate-800/50`.
- Keep "Pilih semua", "Hapus (n)" red, "Muat lebih" outline button.
- Empty state: centered Lucide icon (slate-300) + title + hint + optional CTA.

### Wallets
- Wallet entries as `.card` rows/grid: colored kind tile (sky/amber), name, balance `tabular-nums`, adjust/edit/delete ghost icon buttons. 2-col grid on `sm+` only if rows stay short (designer judgment; no over-engineering).
- Add-form `.card`: `.label` + `.input` name; kind segmented toggle with **sky active for Digital / amber active for Tunai** (kind semantics, not brand); preset chips (GoPay/OVO/DANA/ShopeePay/Tunai) neutral, orange when applied.
- Group headers Digital (sky) / Tunai (amber); dialogs (adjust balance) restyled like shared dialogs.

### Hutang
- KPI cards `.card` with icon tiles: Hutang red, Piutang emerald, Selisih slate (or red/green by sign).
- Rows: initials avatar circle (first letters of person, tint red or emerald by direction); name + badge (Utang red / Piutang emerald / Lunas emerald); meta date + wallet chip; thin progress bar (direction color); remaining `tabular-nums` right; "Bayar" small `.btn-primary`; delete ghost red hover. Paid rows dimmed.
- Create/Pay dialogs: direction segmented red (owe) vs emerald (pinjamkan) active states; shell like shared dialogs.

### Analytics
- Wrap sections in `.card`; section titles `font-semibold`.
- Category bars `h-2`/`h-2.5` rounded-full; expense `bg-red-500`, income `bg-emerald-500`, track `bg-slate-100 dark:bg-slate-800`. Amounts `tabular-nums`.
- **Add inline-SVG donut** for expense share (no dependency): `circle` stroke-dasharray segments; `<title>`/aria-label; legend with text labels; data-viz palette (muted 500-level: sky/amber/emerald/red/violet/slate) — orange only if genuinely needed, avoid implying "action". Legend text means no hue-only reliance.
- 6-month trend: keep paired income/expense bars, round tops, month-short labels, legend dots.
- Header month picker same pattern.

### Copilot
- Title row: orange Sparkles + heading.
- Provider/model selects in slim toolbar (only when providers exist) styled like filters.
- Bubbles: user = solid `bg-orange-600 text-white` (flat); assistant = `bg-slate-100 dark:bg-slate-800` primary text; error = red tint + "Coba lagi" link.
- Empty state: Sparkles icon + helper text + suggestion chips (orange tint).
- Input row: `.input` + circular orange send button (Send icon), disabled states, autoscroll unchanged; loading bubble with Loader2 spin kept.

### Settings + Login + error
- Panels on `.card` surfaces, `.label`/`.input`, submit `.btn-primary` (full width for password/login).
- Login: centered `.card` with orange logo tile + title; setup notice neutral tint; no gradient backdrop.
- Providers rows ghost edit/delete; "Aktif" emerald check; add-form restyled; error red-600.
- +error.svelte: status number `tabular-nums` slate, title, message, `.btn-primary` back link.

### Shared dialogs/forms
- Modal shell (all dialogs): overlay `bg-slate-950/50`, panel `.card`-like `rounded-xl shadow-lg`, scale+fade transition, header title + Lucide `X`.
- TransactionForm: type segmented — expense red tint active, income emerald tint active, transfer slate/neutral active; amount field `text-lg font-semibold tabular-nums` with live "Rp …" preview (slate-500 informational, not brand); preset chips neutral; submit `.btn-primary`.
- ConfirmModal: keep API; destructive `.btn-danger`, non-destructive `.btn-primary`; close `X` icon.
- Toast: container `bottom-20 md:bottom-4 right-4` (clear of mobile bottom nav); success emerald solid, error red solid; slide/fade; close `X`.
- ThemeToggle: ghost style (Sun/Moon unchanged).
- Skeleton: slate-200/800 pulse blocks; shape matches new row layout.

## Files / Areas Likely Affected

All files in Scope, grouped per implementation step below. No file outside that list (plus `package.json`, `package-lock.json`) may change.

## Implementation Steps

From repo root. Work on branch `feature/ui-redesign` created from clean `main`.

1. **Baseline (builder, inline).** Confirm `git status` clean; create branch; record `npm run check` and `npm test` green before touching anything.
2. **Foundation: tokens + global styles + font (designer).** `npm install @fontsource-variable/plus-jakarta-sans`; `src/app.css` (font import first, `@theme` font override, base layer: focus-visible, selection, reduced-motion); `src/app.html` (theme-color `#ea580c`, body slate classes); best-effort `static/manifest.json` theme_color.
3. **Shared components restyle (designer).** Navigation, ThemeToggle, Toast, Skeleton, ConfirmModal, TransactionForm. Uses only utilities/colors from step 2. Component props/APIs unchanged.
4. **Page restyle batch (4 designers in parallel — disjoint files).**
   - P1: `src/routes/+page.svelte`, `src/routes/+error.svelte`
   - P2: `src/routes/transactions/+page.svelte`, `src/routes/wallets/+page.svelte`
   - P3: `src/routes/hutang/+page.svelte`, `src/routes/analytics/+page.svelte`
   - P4: `src/routes/copilot/+page.svelte`, `src/routes/settings/+page.svelte`, `src/routes/login/+page.svelte`
   Each: apply semantic color map, utility classes, per-area guidance; keep all logic/actions/markup hooks; run `npm run check` and report result before done.
5. **Sweep + consistency pass (builder, inline).** Grep leftovers (`sky-600` brand, `bg-gray|text-gray|border-gray|divide-gray`, `indigo-`, `font-mono`, `bg-gradient|from-|via-|to-`, `rounded-2xl`, `✕`) → fix against the map; unify dialog shell inconsistencies; verify checkbox accents.
6. **Review audit (reviewer, read-only) in parallel with 7.** Full diff review: colors match semantic table, contrast (orange-700 text-on-white links; white-on-orange-600 buttons flagged for fallback decision), dark-mode parity on every touched surface, no gradient/emoji/glow, reduced-motion guard present, a11y labels/aria intact, actions/form names untouched, no server/logic files changed.
7. **Automated verification (builder).** `npm run check`, `npm test`, `npm run build`; `git diff --name-only` scoped to allowed files; confirm woff2 assets emitted.
8. **Manual visual pass (builder + user)** in `npm run dev`: light + dark over every page incl. login(setup+login), home with data + empty, transactions filters/select-all/delete/bulk/load-more, wallets CRUD + adjust dialog, hutang create/pay/delete/bulk, analytics with & without data, copilot chat bubbles/error/empty, settings password + providers + logout, 404. Mobile 375px, tablet, desktop sidebar/bottom-nav; keyboard tab + focus rings; `prefers-reduced-motion` on. Fix findings (builder inline; large UI fixes re-dispatch designer).
9. **Fix + final re-verify (builder).** Apply reviewer + manual findings; re-run check/test/build; final forbidden-pattern greps empty.

Delegation notes: step 4 sub-agents are the only true parallelism; each gets this plan file as reference and a precise file list; disjoint files make conflicts impossible (shared components already done in step 3). Any designer needing to touch a file outside its list must stop and report instead of proceeding.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|---|---|---|---|
| 1 baseline | builder | — | Inline: trivial git/npm, needs builder's shell context |
| 2 foundation | designer | — | Single gate: tokens/utilities must exist before any consumer; shared files app.css/app.html |
| 3 shared components | designer | — | Gate for pages; consumed by every page (sequential after 2) |
| 4 P1 +page/+error | designer | A | Disjoint files from P2–P4 → parallel-safe |
| 4 P2 transactions/wallets | designer | A | Disjoint files |
| 4 P3 hutang/analytics | designer | A | Disjoint files |
| 4 P4 copilot/settings/login | designer | A | Disjoint files |
| 5 consistency sweep | builder | — | Inline: mechanical greps need shared state of all page outputs |
| 6 review audit | reviewer | B | Read-only diff review; independent of build run in step 7 |
| 7 automated verification | builder | B | check/test/build; independent of reviewer reading code |
| 8 manual pass | builder | — | Needs dev server + user; sequential |
| 9 fixes + final verify | builder | — | Inline after 6+8 findings |

Batch A: four `designer` subagents dispatched in ONE message (one per P-group), each instructed: read `plan/ui-redesign.md`, restyle only its listed files, do NOT touch shared components/server, run `npm run check` at end, return summary of color-map decisions + any ambiguity.
Batch B: `reviewer` (read-only audit per step 6) + builder running verification in parallel.
Inline rationale: steps 1,5,7,8,9 need current checkout state/context; step 6 reviewer must see merged state of all A outputs, hence after step 5.

## Acceptance Criteria

1. No `bg-gradient`/`from-`/`via-`/`to-` classes, no gradient CSS, no emoji characters in `src/` UI strings.
2. All UI on palette: brand orange-600/700, income emerald, expense/danger red, digital sky, cash amber, transfer neutral, neutrals slate. Zero leftover brand-`sky-600`, `indigo-*` kind, emerald-cash-kind, or `gray-*` neutrals.
3. Plus Jakarta Sans active; no `font-mono` on money; money uses `tabular-nums`.
4. Light and dark fully styled on every page/component (no unthemed surfaces or unreadable contrast).
5. Contrast: body text ≥ 4.5:1; text links orange-700; white text on orange-600 fill ≥ 3:1 (reviewer-verified; fallback to orange-700 fill pre-agreed if not).
6. Every interactive element keyboard-reachable with visible orange focus ring; all `aria-*`, `role`, labels, and `modalAccessibility` behavior unchanged and intact.
7. Form actions (`?/create|update|delete|bulkDelete|adjust|pay|logout|change-password|save-provider|set-active|delete-provider`, `?/login|setup`), methods, field `name`s, URLs byte-identical in behavior.
8. `git diff --name-only` = subset of the in-scope list.
9. `npm run check`, `npm test`, `npm run build` pass; unit tests untouched and green.
10. Motion minimal and disabled under `prefers-reduced-motion`.
11. Empty states, skeleton, error page, and dialogs all restyled (no plain dashed text-only placeholders remain).
12. User signs off manual pass (step 8) on light+dark+mobile+desktop.

## Verification / Tests

- `npm run check`, `npm test`, `npm run build`.
- Greps (expect empty / only documented): `rg -n "gradient|from-|via-|to-" src`; `rg -n "sky-600|sky-700|indigo-|text-indigo|bg-indigo" src` (sky-500/600 allowed only as digital-kind after map); `rg -n "bg-gray|text-gray|border-gray|divide-gray" src`; `rg -n "font-mono" src`.
- `git diff --name-only` matches allowed file list.
- Manual checklist per step 8 (both themes, all pages, modals, empty states, mobile/desktop, keyboard, reduced motion).

## Git

- Branch: `feature/ui-redesign` off `main`.
- Commits: conventional, granular per phase, e.g. `feat(ui): design tokens + font foundation`, `feat(ui): restyle shared components`, `feat(ui): redesign dashboard & error page`, …, `fix(ui): review findings`. One commit per step keeps the step-6 audit tractable.
- Single plan → after all acceptance criteria pass and user signs off the manual pass, merge to `main` per the sequential-plan workflow, then remove `plan/ui-redesign.md` in the merge commit.

## Integration Notes

- Only plan in flight (`plan/` is otherwise empty; no sibling branches). No merge-order conflicts expected.
- `docs/index.md` references removed plan files (`ux-data-model`, `ux-mobile-settings`) — stale entries, unrelated; do not touch.
- Future feature work must adopt the new `.card`/`.btn`/`.input` utilities + semantic palette; note for later plans, no action now.

## Risks / Notes

- **Tailwind v4 `@apply`:** works with `dark:` variants; custom classes cannot `@apply` other custom classes — write each variant's utilities fully. If a utility name collides, verify against Tailwind v4 docs during step 2.
- **Blind find/replace is forbidden** — gray→slate is safe, but sky/indigo/emerald changes require role classification (maps B/C). Designer subagents report ambiguous occurrences instead of guessing.
- **Dashboard** uses `navigating` + Skeleton for same-route reloads; keep that pattern.
- **Checkbox styling:** v4 uses `accent-*`; keep existing `h-4 w-4 rounded border-…` classes.
- **Font build:** fontsource woff2 emits as hashed client assets; confirm in step 7 build output that `client/_app/immutable/assets/*woff2` exist.
- **Contrast fallback:** if white-on-orange-600 button text fails reviewer contrast on small labels, darken button fill to `orange-700` (brand accents elsewhere stay orange-600) — pre-agreed, do not re-litigate.
