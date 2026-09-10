# Implementation Plan: Code Cleanup — Dead Code + Duplication Pass

## Objective

Whole-repo clean-code / over-engineering audit pass on `main` (audit done in the planner session, findings below). Delete dead code, consolidate repeated markup/logic into shared components, shrink duplicated CSS and class strings. No behavior change. UI copy stays Indonesian, code stays English.

## Scope

In: dead exports, broken asset refs, unused type declarations, duplicated markup/logic (optgroup selects, modal shells, amount presets), duplicated CSS common prefixes, re-invented `.input` class.
Out: schema changes (amount REAL→INTEGER needs a migration + `--remote` run — separate plan), modal rewrite to native `<dialog>` (behavioral change, separate plan), TransactionRow component extraction (visual refactor, separate plan), `createSessionToken(_password)` param removal (symmetry-compat with old app; tests call it with a placeholder — 7-file churn for zero gain, kept deliberately).

## Context

- SvelteKit 2 + Svelte 5 runes, one Cloudflare Worker + D1, Tailwind 4 (no config file, `@layer` CSS in `src/app.css`), class-based dark mode.
- Stack conventions (AGENTS.md): balances computed never stored; all SQL in `src/lib/server/db.ts` with `D1Database` first arg; zod validation server-side only; mutations via form actions + `invalidateAll()`.
- Verification = `npm run check && npm run test` (vitest, node env, fake-Db for SQL — no UI tests; route behavior verified manually).
- Docs that describe current behavior must be updated alongside code (`docs/architecture.md`, `docs/development.md`).
- `static/sw.js` is a live self-cleanup stub (old deploy pinned cache-first SW) — do NOT delete; slated for removal after 2027-01-01 (docs/architecture.md:77).
- `plan/` empty, docs/index.md current — no stale plan cleanup needed.

## Audit findings (planner) — verify each before deleting via grep

1. `getTransaction()` — db.ts:257, 0 usages in src/ (verified grep), not in tests. DEAD.
2. `createTransactions()` — db.ts:287, 0 usages in src/, not in tests. DEAD.
3. `AI_API_KEY?: string` — src/app.d.ts:14, no code reads it (docs/development.md:53 already flags it).
4. `App.Error.code?: string` — src/app.d.ts:23, no reader; `message` is used by +error.svelte.
5. Broken `favicon.png` refs — src/app.html:5 and static/manifest.json:12; `static/` has only `icon.svg` (docs/architecture.md:79 documents the gap).
6. Duplicate salt-length check — src/lib/server/auth.ts:68-69: lines 68 `(salt as Uint8Array).length === 0` and 69 `salt.length === 0` check the same thing.
7. `AMOUNT_PRESETS` — identical 6-row `[amount, label]` array in TransactionForm.svelte:20-27 and hutang/+page.svelte:42-49.
8. Wallet optgroup `<select>` — 5 near-identical copies: TransactionForm.svelte (to-wallet :206-215 + wallet :180-189), transactions/+page.svelte:191-200, hutang/+page.svelte (create :544-553, pay :647-656).
9. Modal backdrop/dialog shell (fixed inset-0 overlay + role=dialog + tabindex + `use:modalAccessibility` + fade/scale transitions + stopPropagation + X button header) — 4 inline copies (TransactionForm.svelte:75-110, wallets/+page.svelte:372-440, hutang create:397-414, hutang pay:575-591) + the same shell inside ConfirmModal.svelte:28-45.
10. `.btn`, `.btn-primary`, `.btn-outline`, `.btn-danger`, `.btn-ghost` in src/app.css:41-55 share a ~6-utility common prefix duplicated 5×.
11. settings/+page.svelte — 8 inputs (edit 4 :225-265, add 4 :355-394) re-invent the `.input` utility string inline instead of using the existing `.input` class.

## Files / Areas Likely Affected

- `src/lib/server/db.ts` (delete 2 funcs)
- `src/app.d.ts` (delete 2 type members)
- `src/app.html`, `static/manifest.json` (favicon)
- `src/lib/server/auth.ts` (dup check)
- `src/lib/constants.ts`, `src/lib/components/TransactionForm.svelte`, `src/routes/hutang/+page.svelte` (presets)
- `src/lib/components/WalletSelect.svelte` (new), `src/lib/components/ModalShell.svelte` (new), `src/lib/components/ConfirmModal.svelte`, `src/routes/transactions/+page.svelte`, `src/routes/hutang/+page.svelte`, `src/routes/wallets/+page.svelte` (dedup)
- `src/app.css` (btn common block), btn markup sites that lack the `btn` base class
- `src/routes/settings/+page.svelte` (`.input`)
- `docs/architecture.md`, `docs/development.md` (keep docs truthful)

## Implementation Steps

1. **Delete dead db exports.** Remove `getTransaction` (db.ts:257-268) and `createTransactions` (db.ts:287-303). Grep first: `rg -n "getTransaction|createTransactions" src/` must return only db.ts. No test changes (neither is imported by `*.test.ts` — verified).

2. **Trim app.d.ts.** Delete `AI_API_KEY?: string;` (line 14) and `code?: string;` (line 23). Keep `App.Error.message`.

3. **Fix favicon refs.** In `src/app.html` delete line 5 (`<link rel="icon" href="%sveltekit.assets%/favicon.png" />`) — line 9's `icon.svg` link stays. In `static/manifest.json` change the icons entry to `"src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"` (delete the "maskable" purpose — no maskable image exists).

4. **auth.ts dup check.** Delete line 68 (`if ((salt as Uint8Array).length === 0) return false;`), keep line 69. Re-run auth tests.

5. **AMOUNT_PRESETS to constants.** Add to `src/lib/constants.ts`:
   ```ts
   /** Quick amount chips shared by the transaction and debt forms. */
   export const AMOUNT_PRESETS: [number, string][] = [
   	[10_000, '+10rb'],
   	[25_000, '+25rb'],
   	[50_000, '+50rb'],
   	[100_000, '+100rb'],
   	[500_000, '+500rb'],
   	[1_000_000, '+1jt']
   ];
   ```
   Replace the local `PRESETS` arrays in TransactionForm.svelte and hutang/+page.svelte with `import { AMOUNT_PRESETS } from '$lib/constants'`. TDD note: no test infra for components; `npm run check` catches type errors.

6. **New component `WalletSelect.svelte`.** Props (Svelte 5 `$props()` pattern, mirroring existing components):
   - `wallets: { id: string; name: string; kind: 'digital' | 'cash' }[]`
   - `name: string` (form field name), `value: string` (bindable via `bind:value`)
   - `excludeId?: string` (transfer target: hides own wallet)
   - `invalid?: boolean` (adds red-border class, keeps callers' error `<p>` outside)
   - `required?: boolean`
   - `className?: string` (extra classes)
   Renders the 15-line `<select>` with digital/cash optgroups from TransactionForm.svelte:180-189 + 206-215. Replace all 5 call sites: TransactionForm wallet + to-wallet selects, transactions filter select (plain value, no bind), hutang create + pay. Callers keep their own `<label>`/`aria-label`/error `<p>` — do NOT over-parameterize.

7. **New component `ModalShell.svelte`.** Props: `{ open?: boolean; title?: string; labelledby?: string; onClose: () => void; width?: string; }` + `children` snippet. Contains exactly the backdrop + dialog wrapper from ConfirmModal.svelte:28-45 (fade on overlay, scale on panel, `prefersReducedMotion`, `use:modalAccessibility`, Escape via onClose, stopPropagation on click/keydown, X close button, `aria-modal`, `tabindex="-1"`, bg `bg-slate-950/50`), plus `aria-label` when `title` given or `id` passthrough via `labelledby`/`id` prop for labelledby pages. Refactor to use it:
   - TransactionForm.svelte:75-110 → `<ModalShell open={open} labelledby="transaction-form-title" onClose={onclose}>` wrapping the rest (form + headers stay in page).
   - wallets/+page.svelte adjust modal :371-440 → ModalShell.
   - hutang create :397-414 and pay :575-591 → ModalShell.
   - ConfirmModal.svelte → renders ModalShell internally (its public API unchanged: `open/title/message/confirmText/cancelText/destructive/onConfirm/onCancel`).
   Result: one a11y source of truth, no behavioral change. Verify each refactor visually (manual pass below).

8. **app.css btn dedup.** Group the shared prefix:
   ```css
   .btn,
   .btn-primary,
   .btn-outline,
   .btn-danger,
   .btn-ghost {
   	@apply inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600;
   }
   ```
   Then slim each variant to only its deltas (`.btn-primary { @apply bg-orange-600 text-white hover:bg-orange-700; }` etc.). Grep every `btn-primary|btn-outline|btn-danger|btn-ghost` usage and ensure each already carries the `btn` base class; add `btn ` where missing (TransactionForm:103 `btn-ghost`, :282 `btn-outline`; ConfirmModal:48 `btn-ghost`, :54 `btn-outline`; check all hits).

9. **settings svelte → `.input`.** Replace the 8 inlined input class strings (`w-full rounded-lg border px-2 py-1.5 ... dark:placeholder...`) with `class="input {errorKey ? 'border-red-400 dark:border-red-500' : ''}"` matching the `.input` utility. Keep the conditional error border exactly as today's strings express it.

10. **Docs truthful.** `docs/architecture.md:79` — replace the favicon-gap sentence with "app icon is `static/icon.svg` only." `docs/development.md:53` — delete the `AI_API_KEY` dead-type note.

11. **Verify.** `npm run check && npm run test` green. Manual UI pass: run `npm run dev` and click through — transaction add/edit modal (open/Escape/focus trap/backdrop close), wallets adjust modal, wallets edit, hutang create + pay modals, all ConfirmModals (delete single/bulk, wallet, debt, provider), transactions wallet filter select, transfer-target select excludes own wallet, settings provider add/edit inputs, quick-amount chips on transaction + debt forms, dark mode + reduced-motion paths unaffected.

## Acceptance Criteria

- `getTransaction` and `createTransactions` no longer exist; `rg "getTransaction|createTransactions" src/` → empty.
- No `favicon.png`, `AI_API_KEY`, `App.Error.code` references anywhere; `rg "favicon.png|AI_API_KEY" .` (excluding graphify-out/ and .wrangler/) → empty.
- `AMOUNT_PRESETS` imported by both forms; no local `PRESETS` copies.
- Exactly one optgroup-select implementation (WalletSelect.svelte) and one modal shell (ModalShell.svelte); all 4 inline shells + ConfirmModal use it.
- app.css btn block: shared prefix appears once; every btn-variant usage carries `btn`.
- settings inputs use `.input`.
- `npm run check` and `npm run test` pass (auth suite re-run after step 4).
- Manual UI pass list (step 11) complete with no regressions.

## Verification / Tests

- `npm run check` (svelte-check, TS strict) — catches component-API mistakes in steps 6-7.
- `npm run test` — vitest: auth (verifies step 4), ai, db (fake-Db, asserts SQL unchanged — db.ts query strings must not change in step 1), validation, aiProviders.
- No new tests required: no logic change, pure deletion/consolidation; manual UI pass covers the component refactors (documented repo convention: route/UI verified manually).

## Git

- Branch: `feature/code-cleanup-audit` (from `main`).
- Commit granularity: one commit per step (1-10) + final "chore: verify" if anything surfaced. Conventional messages, repo style (`fix:`, `refactor:`, `docs:`), e.g. `refactor: extract WalletSelect and ModalShell components`, `chore: remove dead db exports getTransaction/createTransactions`.
- Push branch; do NOT self-merge.

## Integration Notes

- Single independent plan, no sibling branches. Merge inline per builder.md workflow after verification; delete `plan/code-cleanup-audit.md` on merge and confirm `docs/index.md` plan list stays unchanged (this plan is housekeeping, not a feature).
- Files this plan touches that other known plans could overlap: none in flight (`plan/` empty, docs/index.md lists no approved-unmerged plans).
- `src/app.css` is owned by the Tailwind layer — any co-builder changing it (none known) would conflict.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1-5, 8-11 | builder | - | Inline: tiny mechanical edits, each needs the current working-tree context |
| 6-7 (WalletSelect, ModalShell) | builder | - | Inline: small components matching existing component idioms; spawn designer only if guidance wanted — kept inline because the codebase already defines the exact pattern (ConfirmModal/TransactionForm) to mirror |

Batch A: none. Rationale: repo is small (~45 src files), every step reads/writes overlapping files (hutang/+page.svelte touched by steps 5, 6, 7), and the environment hit model rate limits on parallel subagent dispatch during analysis — parallel ownership would cost more than it saves here. Sequential single-builder execution is both fastest and least error-prone.