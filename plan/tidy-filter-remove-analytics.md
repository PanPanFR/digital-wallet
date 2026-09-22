# Implementation Plan: Tidy Transactions Filter Form + Remove Analytics Feature

## Objective

Two independent changes to the digital-wallet app:

1. **Rework the transaction filter form** on `/transactions` so the controls (month, wallet, description search, category, apply/reset buttons) render neatly: consistent alignment, consistent widths, buttons grouped — on both mobile and desktop.
2. **Remove the Analytics feature entirely** (page, API route, charts, dependency) because it is not needed. Shared aggregate helpers used by Dashboard and the AI copilot must be preserved.

## Scope

**In scope**

- `web/src/pages/Transactions.tsx` — filter form markup/layout only (behavior unchanged).
- Full removal of `/analytics`: page, route, nav entry, query key, API route, backend route file, orphaned DB helper + tests, chart components, `recharts` dependency, dead chart CSS, and documentation references to Analytics.

**Out of scope**

- Any change to filter *behavior* (which param applies on change vs on submit, URL-param mechanism).
- The chip row ("Semua / Digital / Tunai") above the form — it stays as is.
- `getCategoryTotals`, `getMonthlySummary`, `getMonthlyTotals`, `getKindTotals` — shared by Dashboard (`worker/routes/dashboard.ts`) and AI copilot (`worker/routes/ai.ts`); MUST remain.
- Historical spec `docs/specs/2026-09-08-digital-wallet-design.md` — leave untouched (historical record).
- `graphify-out/` contents (regenerated separately, never hand-edited).

## Context

- Stack: Vite + React 19 + react-router, Hono API on one Cloudflare Worker, D1. TS strict. Tailwind 4 via `@tailwindcss/vite`, no config file; component utilities live in `web/src/index.css` (`.input`, `.btn*`, `.label`, `.chip`, `.card`, ...).
- UI copy Indonesian, code/docs English.
- Verification = `npm run check && npm run test && npm run build`.
- Tests: `worker/db.test.ts` uses a fake-Db capturing prepared SQL; `worker/api.test.ts` exercises routes via `app.request`.
- Repo rule: all SQL lives in `worker/db.ts`; balances computed, never stored.

### Problem 1 — why the filter form looks messy

Current form (`web/src/pages/Transactions.tsx:260-330`):

```
className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
```

`<label>` elements and their controls are **flat siblings** of the grid/flex container:

- Mobile (`grid-cols-2`): each label occupies its own grid cell ("Bulan" in one cell, its input in the next), so rows misalign; controls have `w-full` while labels don't, producing ragged rows.
- Desktop (`sm:flex sm:flex-wrap`): labels and inputs flow inline with only `gap-2`; input widths are content-dependent (`sm:w-auto`), so every control has a different width and the row wraps unpredictably at ~736px; "Terapkan" and conditional "Reset" land wherever wrap allows.

### Problem 2 — Analytics removal map (verified by grep)

Used ONLY by Analytics → safe to delete:

| Artifact | Location |
|---|---|
| Page | `web/src/pages/Analytics.tsx` |
| Charts (5 files) | `web/src/components/charts/{CategoryBarChart,CategoryDonutChart,MonthlyTrendChart,WalletBarChart,chartPalette}.tsx/.ts` |
| Route registration | `web/src/app.tsx` (lazy import line 17, `<Route path="/analytics">` line 90) |
| Nav entry + icon | `web/src/components/Navigation.tsx` (item line 33, `BarChart3` import line 8) |
| Query key | `web/src/lib/queryKeys.ts` line 6 |
| Type | `shared/types.ts` `AnalyticsData` (line 30) |
| API mount | `worker/index.ts` (import line 9, `app.route('/api/analytics', ...)` line 42) |
| Route file | `worker/routes/analytics.ts` |
| API test block | `worker/api.test.ts` `describe('/api/analytics')` (line ~340) |
| DB helper | `worker/db.ts` `getWalletTotals` (line ~430) — only caller is the analytics route |
| DB test block | `worker/db.test.ts` `describe('getWalletTotals')` (line ~241, import line 15) |
| Dependency | `package.json` `"recharts": "^3.0.0"` — only charts import it |
| Dead CSS | `web/src/index.css` `.chart-root` variable block — only charts use it |

Shared helpers that must STAY (used by dashboard + AI copilot): `getCategoryTotals`, `getMonthlySummary`, `getMonthlyTotals`, `getKindTotals`.

After removal, `/analytics` falls through `<Route path="*">` → `<Navigate to="/" replace />` (already in `app.tsx`).

## Dependencies

- No sibling plans exist (`plan/` empty) → no merge ordering.
- Requires a `feature/tidy-filter-remove-analytics` branch off current `main`.

## Files / Areas Likely Affected

**Filter form (step 2)**

- `web/src/pages/Transactions.tsx` — rewrite form block only (lines ~260-330).

**Analytics removal (steps 1, 3)**

- Delete: `web/src/pages/Analytics.tsx`, `web/src/components/charts/*` (whole dir), `worker/routes/analytics.ts`.
- Edit: `web/src/app.tsx`, `web/src/components/Navigation.tsx`, `web/src/lib/queryKeys.ts`, `shared/types.ts`, `shared/format.ts` (header comment mentions analytics), `worker/index.ts`, `worker/api.test.ts`, `worker/db.ts`, `worker/db.test.ts`, `web/src/index.css` (`.chart-root` block), `package.json` + `package-lock.json` (via `npm uninstall recharts`).
- Docs: `README.md` (Analytics bullet), `docs/architecture.md` (line ~64 chart sentence), `docs/data-model.md` (line ~165 `getWalletTotals` row), `AGENTS.md` (line 45 Charts rule).

## Implementation Steps

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 | builder (inline) | A | Mechanical multi-file removal: file deletions + import/line stripping + `npm uninstall` — patterned bulk edit, done as one script-driven pass; never split across subagents |
| 2 | designer | A | UI layout redesign confined to `Transactions.tsx`; no shared files with steps 1/3 |
| 3 | documenter | A | Docs/README/AGENTS.md text updates; files disjoint from code edits |
| 4 | builder (inline) | - | Runs `npm run check && npm run test && npm run build`, fixes fallout — needs full context from steps 1-3 |
| 5 | builder (inline) | - | `graphify update .`, commit — trivial, needs current git state |

**Batch A = steps 1, 2, 3 dispatched in one message (parallel).** Step 4 depends on 1-3; step 5 depends on 4.

### Step 1 — Remove Analytics (builder, mechanical, single script pass)

1. Delete: `web/src/pages/Analytics.tsx`, `web/src/components/charts/` (all 5 files), `worker/routes/analytics.ts`.
2. Strip references (one PowerShell/Node script or a few precise edits):
   - `web/src/app.tsx`: remove `const Analytics = lazy(...)` and the `/analytics` `<Route>` line.
   - `web/src/components/Navigation.tsx`: remove the `/analytics` item from `items` and the now-unused `BarChart3` import.
   - `web/src/lib/queryKeys.ts`: remove `analytics` key.
   - `shared/types.ts`: remove `AnalyticsData` interface; `shared/format.ts`: fix header comment (drop "analytics").
   - `worker/index.ts`: remove analytics import + `app.route('/api/analytics', ...)`.
   - `worker/api.test.ts`: remove the `describe('/api/analytics', ...)` block.
   - `worker/db.ts`: remove `getWalletTotals` (+ `WalletTotal` type only if no other consumer — grep first); `worker/db.test.ts`: remove its import line + `describe('getWalletTotals')` block.
   - `web/src/index.css`: remove the `.chart-root` CSS-variable block.
3. `npm uninstall recharts` (updates `package.json` + lockfile).
4. **Guardrail**: grep `getCategoryTotals|getMonthlySummary|getMonthlyTotals|getKindTotals` — confirm `worker/routes/dashboard.ts` and `worker/routes/ai.ts` imports untouched.
5. **Guardrail**: grep `WalletTotal` before removing the type; if another consumer exists, keep the type, delete only the function.

### Step 2 — Rework filter form (designer)

Replace the form block only (`Transactions.tsx` ~260-330); keep ALL handlers, ids, aria-labels, state wiring exactly as-is. Target structure:

```tsx
<form className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-end">
  {/* per field wrapper (Bulan, Dompet, Cari, Kategori): */}
  <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
    <label htmlFor="tx-filter-month" className="label">Bulan</label>
    <input id="tx-filter-month" ... className="input w-full" />
  </div>

  {/* buttons: own row on mobile, right-aligned on desktop */}
  <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1 sm:justify-end">
    <button type="submit" className="btn btn-outline px-4 py-2">Terapkan</button>
    {(month || wallet || q || category) && (
      <button type="button" onClick={resetFilters} className="text-sm text-ctp-peach hover:underline">Reset</button>
    )}
  </div>
</form>
```

Rules for the designer:

- **Label above control** in every field, consistent gap — kills the ragged inline-label alignment.
- Mobile: 2-column grid, controls `w-full`; 4 fields fill 2×2, buttons span full width below in one row.
- Desktop (`sm:`): single row — 4 equal fields + button group far right, bottom-aligned (`sm:items-end`).
- Reuse existing utilities only: `.input`, `.btn`, `.btn-outline`, `.label` (verify `.label` styling in `web/src/index.css` fits small filter labels; if not, keep `text-sm text-ctp-subtext1` as today). **Do NOT edit `index.css` in this step** — step 1 owns that file.
- Do NOT re-add `sm:w-auto` to inputs — equal-width columns are the point.
- Behavior identical: `month`/`wallet`/`category` apply on change, `q` applies on submit, Reset conditional.
- Search input and category select currently use only `aria-label`; prefer adding visible labels ("Cari", "Kategori") so all four fields are uniform.

### Step 3 — Documentation (documenter)

- `README.md`: remove the Analytics bullet.
- `docs/architecture.md` line ~64: remove the Charts/Recharts sentence.
- `docs/data-model.md` line ~165: remove the `getWalletTotals` row (scan the table for other analytics-only rows).
- `AGENTS.md` line 45: remove the "Charts: Recharts..." rule.
- Do NOT touch `docs/specs/2026-09-08-digital-wallet-design.md` (historical).

### Step 4 — Verify (builder inline)

Run `npm run check && npm run test && npm run build`; fix fallout (unused imports, leftover types).

### Step 5 — Wrap up (builder inline)

- `graphify update .` (AST-only, no API cost).
- Commit on the feature branch.

## Acceptance Criteria

1. `/transactions` filter form: every control sits under its own visible label; mobile shows a tidy 2×2 field grid with a full-width button row; desktop shows one aligned row of four equal-width fields with Terapkan/Reset grouped at the right edge; no wrap-induced random placement at ~736px.
2. Filter behavior unchanged (change-vs-submit semantics, URL params, conditional Reset).
3. `/analytics` gone: no nav entry, direct URL redirects to `/`, `GET /api/analytics` not mounted (404), no `AnalyticsData`/`queryKeys.analytics` symbols.
4. `recharts` removed from `package.json`/`package-lock.json`; `web/src/components/charts/` gone; no `.chart-root` CSS left.
5. Dashboard + AI copilot aggregates untouched: `getCategoryTotals`, `getMonthlySummary`, `getMonthlyTotals`, `getKindTotals` still exported, imported, tested.
6. `npm run check && npm run test && npm run build` all green.
7. Docs no longer advertise Analytics (README, architecture, data-model, AGENTS.md).

## Verification / Tests

```bash
npm run check    # tsc --noEmit — catches dangling imports/types after removal
npm run test     # api.test.ts + db.test.ts must pass with analytics blocks removed
npm run build    # vite build — catches deleted lazy route / chart imports
```

Manual (dev server):

- `/transactions`: inspect form at mobile (~375px) and desktop (~736px+); set filters, confirm Reset appears/works.
- `/analytics`: expect redirect to `/`.
- `/` dashboard and `/copilot`: load, aggregates render (regression guard).

Grep guardrails:

```bash
grep -ri "analytics" web/src worker shared -include=*.ts -include=*.tsx   # expect: no code hits
grep -rn "recharts" web/src worker shared                                 # expect: none
```

## Git (branch: feature/tidy-filter-remove-analytics)

```bash
git checkout -b feature/tidy-filter-remove-analytics
# batch A (steps 1-3), then step 4 verification:
npm run check && npm run test && npm run build
git add -A
git commit -m "feat: tidy transactions filter form; remove analytics feature"
git status   # verify clean
```

No self-merge. Awaits user `/integrate`.

## Integration Notes

- **Sibling plans**: none — `plan/` otherwise empty → no merge ordering.
- **File ownership within this plan**: step 2 (designer) owns `web/src/pages/Transactions.tsx` exclusively; steps 1/3 must NOT touch it. Step 1 owns `web/src/index.css` (`.chart-root` removal) — designer must not edit `index.css`.
- **Risk**: if `WalletTotal` has an unexpected consumer, keep the type and delete only the function (step 1 guardrail).
- **Lockfile**: `package-lock.json` changes come only from `npm uninstall recharts` in step 1 — no other step runs installs concurrently.
