# Implementation Plan: Mobile Home + Transactions Fix

## Objective

Fix the mobile (360–390px) layout of Beranda (`/`), Transaksi (`/transactions`), and the bottom nav so the `+` FAB is truly centered and nothing overflows or wraps raggedly — with zero logic/behavior changes.

## Scope

**In:**
- `Navigation.svelte` mobile pill: true-centered Catat FAB, even gutters, safe-area kept.
- `+page.svelte` (Beranda): header stacking, remove duplicate CTA, balance truncation, chart overflow guard.
- `transactions/+page.svelte`: filter form grid on mobile, list-row restructure (no overflow, tappable actions).

**Out (explicitly NOT in this plan):**
- No color/typography/theme changes (Catppuccin tokens stay as-is, `architecture.md` §Visual layer wins).
- No new components, files, deps, routes, SQL, migrations, or validation changes.
- No desktop redesign — `md+` must look identical before/after (screenshot-compared).
- No `PRODUCT.md`/`DESIGN.md`/`docs/` authoring (they don't exist; see Context).

## Context

**Stack:** SvelteKit 2 + Svelte 5 runes, Tailwind 4 (no config, via `@tailwindcss/vite`), class-based dark mode, Catppuccin Latte/Mocha tokens in `src/app.css`, LayerChart `BarChart` (themed via `.lc-root-container` vars only), Cloudflare Worker + D1. UI copy Indonesian, code English.

**Conventions (from `AGENTS.md` + `docs/architecture.md`, binding on builder):**
- Component utilities live in `src/app.css` (`.card`, `.btn*`, `.input` min-height 44px, `.chip` min-height 32px, `.page-header`, `.list`, `.list-row`, `.tile` circular). Reuse, don't reinvent.
- No gradients, solid fills only. No new colors — Catppuccin vars only. No new npm deps.
- Mobile uses safe-area padding (`pb-[env(safe-area-inset-bottom)]`); bottom content padding `pb-28 md:pb-6` accounts for the floating nav — keep both.
- Modals/sheets use `ModalShell` (`variant="center" | "sheet"`); reduced-motion respected.
- Mutations = SvelteKit form actions + `invalidateAll()`; FAB opens the form via `window` event `open-transaction-form` — do not rewire.
- Amounts use `.num` tabular + `formatIDR` (`Rp ` regular space); hero uses `.currency-display` (28px desktop / 22px mobile).
- Verification = `npm run check && npm run test`. Route/UI behavior is manual (no UI test harness; `db.test.ts` fake-Db only, untouched here).
- After code changes run `graphify update .`.
- No `docs/` spec files for this area exist (checked: `docs/` holds only `architecture/data-model/development/deployment/index` + 2 historical rewrite specs; no PRD/TDD/api-spec/ui-ux/ADR, no `PRODUCT.md`/`DESIGN.md`). Incumbent code + `architecture.md` §§ Frontend layering / Styling & theme are the spec. Impeccable mode for this work: **Operate** (task-completion UI — scanability, consistency, native expectations outrank expression).

**Root causes found (evidence):**
1. FAB off-center — `src/lib/components/Navigation.svelte:91-143`: pill is `flex justify-around` with **6 children** (Beranda, Transaksi, FAB, Dompet, Analitik, Lainnya). 2 links left vs 3 right of the FAB → gutters can never be equal. Doc (`architecture.md`) describes a 5-slot nav, code has 6 — the 6th item broke the symmetry.
2. Beranda header squeeze — `src/routes/+page.svelte:92-116`: `page-header` is single-row flex with month `<input class="input w-auto">` + Catat button; on 360px it compresses. Plus **3 duplicate Catat CTAs** (header:109, hero:129, quick tile:138).
3. Transaksi "acak-acakan" — `src/routes/transactions/+page.svelte:289-339`: filter form is `flex flex-wrap` of `w-auto` inputs → ragged uneven wrap on mobile. Rows `:390-455` pack checkbox + tile + flex-1 + **2 chips** + nowrap amount + 2 icon buttons in one flex row → overflow/wrap on 360px.
4. Large IDR strings (e.g. `Rp 123.456.789`) in `text-lg` saldo cards (`+page.svelte:197-209`) can overflow 50% cards on 360px — no `min-w-0`/truncate.

**Alternatives considered:**
| Approach | Cost | Benefit | Trap → verdict |
|---|---|---|---|
| A. Minimal in-place fix (chosen) | 1 session, 3 files, CSS/DOM reorder only | Lowest regression, keeps IA/tokens/events | Doesn't add new patterns — acceptable, this is a bugfix → **do this** |
| B. Extract new components (BottomNav/TxRow/FilterBar) | Medium, new files + prop/event plumbing | Cleaner reuse | Over-engineering for a visual bug; risks breaking GET-param filters + bulk-select state → **reject** |
| C. Full visual redesign | High, needs brief + approval rounds | Bold new look | No brief exists, scope creep, breaks Operate consistency → **reject** |

## Dependencies

- None. No sibling plans, no migrations, no API changes, no lockfile changes.
- Baseline: `main` clean (plan commits to `main`; implementation branches off it).

## Files / Areas Likely Affected

- `src/lib/components/Navigation.svelte` (mobile pill only, lines ~86-144; desktop `aside` untouched).
- `src/routes/+page.svelte` (header ~92-116, hero CTA ~129-134, quick actions ~137-157, saldo cards ~191-211, trend section ~213-258; chart props untouched).
- `src/routes/transactions/+page.svelte` (filter form ~289-339, rows ~388-457, bulk bar ~357-381; server file untouched).
- `src/app.css` — expected **untouched** (all fixes via inline Tailwind). If a token is truly missing, it goes through serial Step 5, never in the parallel batch.
- Explicitly NOT touched: `+page.server.ts` files, `db.ts`, `validation.ts`, `TransactionForm.svelte`, `ModalShell.svelte`, `WalletSelect.svelte`, `+layout.svelte`, wrangler/schema/migrations.

## Implementation Steps

### Step 1 — Baseline (builder, inline)

1. Branch off `main`: `feature/mobile-home-transactions`.
2. `npm run check` green before edits (record output).
3. Serve dev, capture baseline screenshots at **360×740 and 390×844, light + dark**: Beranda top/header/hero, quick actions, saldo cards, trend, wallet list, recent list; Transaksi filter area, one list row with long description, bottom nav on both routes. Max 2 capture rounds total for the whole task (impeccable bounded passes).

### Step 2 — Bottom nav: true-centered FAB (5-cell grid)

File: `src/lib/components/Navigation.svelte`, mobile `<nav>` block only.

1. Change pill container (`div` line ~91) from `flex items-center justify-around … px-2` to `grid grid-cols-5 items-center px-2`.
2. Reorder cells to exactly 5: **Beranda | Transaksi | FAB | Dompet | Lainnya**. Move **Analitik into the "Lainnya" sheet** (mobile only; desktop `aside` keeps all 7 items unchanged). Rationale: symmetric 2+2 around the FAB is the only way to center it; Analitik is the least-frequent money task and stays one tap away in the sheet next to Hutang/Copilot/Pengaturan.
3. FAB cell: `flex justify-center`; button `h-14 w-14 -translate-y-3 place-self-center rounded-full bg-ctp-peach text-white ring-4 ring-[#2c2f47] shadow-md active:scale-95` (raised above pill, ring cuts it from the pill bg, still `aria-label="Catat transaksi"`, same `open-transaction-form` dispatch).
4. Link cells: keep `min-h-[48px] min-w-0 flex-col items-center justify-center text-[10px]`, add `w-full` so each column shares width equally; keep active state `text-ctp-peach` + `aria-current`.
5. Keep: outer `px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden`, pill `bg-[#2c2f47]/95 backdrop-blur`, `ModalShell variant="sheet"` block unchanged except the added Analitik entry (reuse same link markup, with subtitle `Tren & kategori`).
6. Do NOT touch `src/app.css` in this step.

### Step 3 — Beranda mobile stacking + dedup CTA

File: `src/routes/+page.svelte`.

1. Header (`page-header` div): add `flex-wrap`: `class="page-header flex-wrap"`. Title block stays; controls `form` gets `flex min-w-0 flex-1 items-center gap-2 sm:flex-none`; month input `class="input min-w-0 flex-1 px-2.5 py-1.5 sm:w-auto sm:flex-none"`; header Catat button unchanged (desktop identical, mobile wraps to its own row, full-bleed).
2. Delete the hero duplicate CTA (lines ~129-134, `button.btn-primary.mt-3` inside the `bg-ctp-blue` section). Remaining CTAs: header Catat + quick-action tile + FAB — enough.
3. Quick actions (`section[aria-label="Aksi cepat"]`): `gap-3` → `gap-2 sm:gap-3`; each label `text-xs` → `text-[11px] sm:text-xs`, add `min-w-0 text-center leading-tight`.
4. Saldo-per-jenis cards: each card div add `min-w-0`; amount `text-lg` → `text-base sm:text-lg`, add `truncate` (keep `.num … tabular-nums`). Labels keep icon + text, add `truncate`.
5. Trend section: section add `min-w-0`; chart wrapper `h-56` → `h-56 w-full min-w-0`; `BarChart` props untouched.
6. Wallet list + recent list: no structural change; confirm `truncate` + `min-w-0 flex-1` already present (they are) — only verify in screenshots.
7. Do NOT touch `src/app.css`, chart data, `load`, or the `open-transaction-form` effect.

### Step 4 — Transaksi mobile: filter grid + row restructure

File: `src/routes/transactions/+page.svelte`. Server file untouched (GET params `month/wallet/q/category/offset` identical).

1. Filter form (`form[method="GET"]`, ~line 289): `class="mb-4 flex flex-wrap …"` → `mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center`. Children: month input `class="input w-full sm:w-auto"`, `WalletSelect className="w-full sm:w-auto"`, search `class="input w-full sm:w-auto"`, category select `class="input w-full sm:w-auto"`, Terapkan button `class="btn btn-outline col-span-2 px-3 py-2 sm:col-span-1"` (full-width on mobile), Reset link `class="col-span-2 text-sm … sm:col-span-1"`. Grid placement: [Bulan][Dompet] / [Cari][Kategori] / [Terapkan full-width][Reset]. Keep all `name` attributes and the GET action exactly as-is.
2. Chips row (`Filter jenis dompet`, ~265): unchanged (`flex-wrap` already fine).
3. List rows (`ul.list > li.list-row`, ~390): restructure inner layout, same elements:
   - `li` add `min-w-0`.
   - Keep checkbox + tile as-is.
   - `div.min-w-0.flex-1` keeps description `truncate` + meta line; move **both chips INTO the meta paragraph** as `hidden sm:inline-flex` (wallet chips are the overflow source; category · date stays visible on mobile).
   - Amount span: keep `.num … whitespace-nowrap`, `text-sm` → `text-[13px] sm:text-sm`.
   - Actions div: `flex gap-1` → `flex shrink-0 gap-0.5`; buttons `p-1.5` → `p-2` (≥40px target with icon 15px; 44px ideal unattainable without growing the row — 40px accepted, recorded here).
   - Transfer chip (`→ dest`) also `hidden sm:inline-flex` (same rule).
4. Bulk bar + segmented control + Total/Aktivitas cards + empty states + `hasMore`: unchanged.
5. Do NOT touch `src/app.css`, bulk-select state logic, `enhance` handlers, or modals.

### Step 5 — Shared CSS (only if needed; serial)

- Default: no `src/app.css` change. If Steps 2–4 prove a token/utility is genuinely missing (not just an inline class), add it here in one serial edit (never parallel with Steps 2–4) and re-run `npm run check`.

### Step 6 — Verify + review (parallel batch B)

- Tester: `npm run check && npm run test` green; walk the manual checklist (Acceptance Criteria) on dev at 360×740 + 390×844, light + dark; report pass/fail per bullet with screenshots.
- Reviewer (read-only): diff vs `AGENTS.md` rules — no SQL/validation/auth changes, no new deps, form actions + `invalidateAll()` intact, `open-transaction-form` wiring intact, GET filter params identical, a11y (`aria-current/pressed/label`, focus-visible, 40px+ targets, reduced-motion) preserved, dark mode intact.
- Fix round: at most ONE fix batch from review findings, then ONE confirmation screenshot round. Stop polishing after that.

### Step 7 — Finalize (builder, inline)

1. `graphify update .`
2. Push `feature/mobile-home-transactions` (no merge — branches never self-merge).
3. Report: branch name, check/test output, before/after screenshots, any accepted deviation from this plan.

## Acceptance Criteria

- [ ] 360×740 and 390×844, light + dark: **zero horizontal scroll** on `/` and `/transactions` (devtools overflow check + visual).
- [ ] FAB: visually centered in the pill (left/right gutter difference ≤4px on screenshot), raised, fully tappable, opens the Catat sheet from both routes.
- [ ] Mobile nav shows Beranda, Transaksi, FAB, Dompet, Lainnya; Analitik reachable via Lainnya sheet; desktop sidebar unchanged (all 7 items).
- [ ] Beranda mobile: header wraps without overlap; hero duplicate CTA gone; saldo amounts never overflow their cards (truncate); trend chart contained; wallet/recent rows truncate cleanly.
- [ ] Transaksi mobile: filter controls form an aligned 2-col grid with full-width Terapkan; chips row wraps neatly; every row shows checkbox, icon, truncated description, category · date, amount, edit + delete — no overlap at 360px with a 60-char description.
- [ ] Touch targets: inputs 44px (`.input` unchanged), nav items 48px, row action buttons ≥40px.
- [ ] Behavior identical: month/wallet/search/category filters, offset pagination, typeFilter, bulk-select + bulk delete, FAB event, modals, toasts — all work as before.
- [ ] Desktop (`md+`) pixel-identical vs baseline screenshots for all three areas.
- [ ] `npm run check && npm run test` green.

## Verification / Tests

- Automated: `npm run check` (svelte-check strict) + `npm run test` (vitest, server suites only — no UI harness exists; do not add one in this plan).
- Manual (on `npm run dev`, local D1): the Acceptance Criteria checklist above, 2 viewport sizes × 2 themes × 2 routes + desktop regression pair. Screenshots before/after attached in the final report.
- Rollback: pure UI diff on 3 files (+ optional `app.css`); revert branch if any behavior delta is found.

## Git

- Plan commits to `main` (this file). Implementation branch: **`feature/mobile-home-transactions`** (fresh off `main`).
- Parallel branches do NOT self-merge. After green, user runs `/integrate` from a `main` checkout; this plan merges standalone (no ordering constraints).

## Integration Notes

- Single-workstream plan: no sibling plans, no shared-schema/API changes, no migrations, no lockfile changes. Only overlap risk is `src/app.css` if Step 5 is needed — handled serially inside this plan.
- Post-merge cleanup (via `/integrate`): remove this plan file from `plan/`.
- Follow-up (NOT this plan, offer after): run impeccable `init` to capture `PRODUCT.md` + `DESIGN.md` so future visual work has a brief; consider moving Analitik back to the mobile bar only with real usage data.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 Baseline + branch + screenshots | builder | – | Inline: trivial, needs current shell/dev context; sets up everything below |
| 2 Bottom nav FAB grid | designer | A | UI-only, file `Navigation.svelte` — no shared state with Steps 3–4 (app.css off-limits in batch A) |
| 3 Beranda stacking + dedup | designer | A | UI-only, file `+page.svelte` — disjoint from Steps 2, 4; parallel-safe under the app.css freeze |
| 4 Transaksi grid + rows | designer | A | UI-only, file `transactions/+page.svelte` — disjoint from Steps 2–3; same freeze makes it parallel-safe |
| 5 Shared CSS (conditional) | builder | – | Serial: only runs after batch A, resolves any token gap in one place; avoids 3-way `app.css` merge conflict |
| 6a Manual + automated verification | tester | B | Test specialization: runs check/test + checklist, iterates failures in isolation |
| 6b Diff review vs repo rules | reviewer | B | Read-only review specialization; parallel to 6a (no shared state — one reads diff, one runs app) |
| 7 Finalize + push | builder | – | Inline: trivial git/graphify/report, needs accumulated context |

Batch A = Steps 2+3+4 dispatched in ONE message (3 parallel designer prompts, each self-contained with its file + constraints + no-app.css rule). Batch B = tester + reviewer in ONE message. Dependencies: 1 → A → 5 → B → 7. If Step 5 is skipped (expected), B starts right after A. Inline rationale: builder keeps shell/git/screenshot context (Steps 1, 5, 7); designers own disjoint UI files in parallel; tester/reviewer own their specializations in parallel; nothing is delegated that needs the delegator's live dev-server state beyond screenshots + branch.
