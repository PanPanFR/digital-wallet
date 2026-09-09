# Implementation Plan: UI Cleanups (Debt Wording + Home Summary Cards)

## Objective

Two small UI text/layout cleanups:
1. Simplify the confusing debt wording: "Kamu Berutang" / "Dipinjamkan" → clearer first-person labels.
2. Remove the Pemasukan (income) and Pengeluaran (expense) summary cards from the home page, per user decision (Option C: keep everything else; keep the "Saldo Bersih" card).

## Scope

- `src/routes/hutang/+page.svelte`: replace labels at 4 locations.
- `src/routes/+page.svelte`: delete the two cards in the summary section (lines ~108-131), keep "Saldo Bersih", adjust layout so the remaining card renders full-width.
- No logic, no data, no schema changes. No other page touched (analytics/transactions/form labels stay as-is per Option C).

## Context

- Stack: SvelteKit 2 + Svelte 5 (runes), Tailwind 4, zod, vitest. No tests affected (UI text/layout only).
- Current wording in `hutang/+page.svelte`:
  - L148 summary card 1: "Kamu Berutang" → **"Hutang Saya"**
  - L158 summary card 2: "Dipinjamkan" → **"Piutang Saya"**
  - L336 create-form toggle: "Kamu Berutang" → **"Saya Berhutang"**
  - L347 create-form toggle: "Dipinjamkan" → **"Saya Meminjamkan"**
- Consistency: home page already uses "Hutang & Piutang" (`+page.svelte:160`); direction badges use "Utang"/"Piutang" (`hutang/+page.svelte:204`).
- Home summary section (`+page.svelte:108-149`): `<section class="mt-6 grid gap-3 sm:grid-cols-3">` holding 3 cards: Pemasukan (L109-119), Pengeluaran (L121-131), Saldo Bersih (L133-148). Remove the first two; change section class to drop the grid (use `mt-6` + single card) so Saldo Bersih spans full width.

## Dependencies

None. Branches from current `main` (5ac576b). No file overlap with sibling plans (ai-provider-settings touches `settings/*`, wallet-fixes touches `wallets/*` + `db.ts`, bulk-select touches `transactions/*` + `hutang/*` server + `db.ts`) — **this plan is the only one touching `hutang/+page.svelte`** (bulk-select touches `hutang/+page.svelte` too? No — bulk-select plan touches `hutang/+page.svelte` for checkboxes. Conflict risk: YES with `plan/bulk-select.md` on `hutang/+page.svelte`.**

**Resolve:** merge this plan (ui-cleanups) FIRST, then bulk-select. The wording edits are in the summary section (L144-177) and form toggle (L326-347); bulk-select edits the list rows (L187-240+). Different regions of the same file — git can auto-merge, but ordering ui-cleanups first makes it deterministic. Record this ordering in Integration Notes.

## Files / Areas Likely Affected

- `src/routes/hutang/+page.svelte` — 4 label replacements.
- `src/routes/+page.svelte` — remove 2 cards, adjust section layout.

## Implementation Steps

1. **`hutang/+page.svelte`** — L148 `Kamu Berutang` → `Hutang Saya`; L158 `Dipinjamkan` → `Piutang Saya`; L336 `Kamu Berutang` → `Saya Berhutang`; L347 `Dipinjamkan` → `Saya Meminjamkan`. Keep icons and styling untouched. (Use exact-match replace per occurrence — the two "Dipinjamkan" strings are identical, so replace each in its surrounding context.)
2. **`+page.svelte`** — delete the Pemasukan card div (L109-119) and Pengeluaran card div (L121-131). Change section wrapper `class="mt-6 grid gap-3 sm:grid-cols-3"` → `class="mt-6"`. The Saldo Bersih card keeps its internal classes. Remove now-unused `TrendingUp`/`TrendingDown` imports if nothing else uses them (`+page.svelte` uses them only in these two cards — verify with grep before removing; `ArrowUpRight`, `HandCoins` etc. stay).
3. **Verify** — `npm run check`, `npm run build`; grep confirms no leftover "Kamu Berutang"/"Dipinjamkan" and no unused import errors.

## Acceptance Criteria

- Hutang page shows "Hutang Saya" / "Piutang Saya" summary cards and "Saya Berhutang" / "Saya Meminjamkan" form toggle.
- Home page shows only "Saldo Bersih" in the summary area, full width; no Pemasukan/Pengeluaran cards.
- `npm run check` 0 errors (no unused-import warnings), `npm run build` ok.

## Verification / Tests

- `npm run check` — svelte-check 0 errors.
- `npm run build` — production build ok.
- `npm test` — existing suite still green (no logic touched, but run to be safe).
- Grep: `rg "Kamu Berutang|Dipinjamkan"` → no matches.

## Git

- Branch: `feature/ui-cleanups`
- Commit style: conventional. Suggested: `fix(hutang): clearer owe/owed labels`, `feat(home): drop income/expense summary cards`.

## Integration Notes

- **Merge order: FIRST** (before `feature/bulk-select`) because both touch `hutang/+page.svelte`. After bulk-select merges, run `npm run check` to confirm no conflict fallout.
- No other overlap with ai-provider-settings or wallet-fixes.
- After all plans integrated: grep for the old wording strings to confirm removal.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 (hutang wording) | builder | A | 4 literal replacements, needs no designer |
| 2 (home cards removal) | builder | A | Layout tweak + import cleanup |
| 3 (verify) | builder | inline | After A |

Entire plan inline by builder: trivial text/layout edits, delegation overhead exceeds the work. No reviewer/tester needed (no logic, no new tests).
