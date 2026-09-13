# Implementation Plan: Backup & Restore (JSON) + Transaction CSV Export

## Objective

Add data portability to Settings: full-database backup/restore via a single
versioned JSON file (merge import, existing IDs skipped), plus a one-way
CSV download of transactions for Excel. No CSV import.

## Scope

In scope:

- `GET /api/backup/export?format=json` — downloads the backup file.
- `GET /api/backup/export?format=csv` — downloads transactions as CSV
  (same endpoint, format switch; CSV is export-only, never imported).
- Settings `?/import-backup` form action — uploads a JSON backup, merges
  it (`INSERT OR IGNORE` semantics, existing IDs skipped), reports
  `{ inserted, skipped }` counts per table.
- New "Data" card in `/settings` UI (Indonesian copy): download JSON,
  download CSV, upload/restore with confirm modal + API-key warning.
- `BackupSchema` in `validation.ts`; export/import data functions in
  `db.ts`; fake-Db test assertions extended first.

Out of scope (explicitly rejected):

- CSV import (relational breakage risk: wallet-name matching, date
  formats, category mapping — YAGNI).
- Raw SQL dump export (leaks secrets, not portable, violates the
  "all SQL in `db.ts`" rule).
- Auto/scheduled backups, cloud sync, multi-file exports.
- Importing `master_password_hash` or `rate_limits` (security, see below).

## Context

Stack: SvelteKit 2 + Svelte 5 runes, one Cloudflare Worker + D1
(`digital-wallet-db`, binding `DB`), Tailwind 4 (no config file,
class-based dark mode, shared utilities `.card .btn .input .label` in
`src/app.css`), zod for server-side validation, vitest unit tests with a
fake-Db capturing prepared SQL. UI copy Indonesian; code/docs English.

Non-negotiable repo rules (from `AGENTS.md`):

- Balances are computed, never stored (`BALANCE_SQL` in `db.ts`).
- All SQL lives in `src/lib/server/db.ts`; every function takes
  `D1Database` as first arg. No D1 in client code.
- zod validation is server-side, one source of truth
  (`src/lib/server/validation.ts`). Every money/data path goes through it.
- Auth guard is `src/hooks.server.ts`: unauthenticated `/api/*` gets
  JSON 401, never a redirect.
- Mutations use form actions + `invalidateAll()`, never hand-rolled
  `fetch` (except the copilot chat endpoint).
- Tests use a fake-Db: when changing SQL in `db.ts`, extend the fake-Db
  assertions **first**.
- File downloads cannot go through form actions (they return page data,
  not file streams) — downloads need a `GET` API route returning a
  `Response` with `Content-Disposition: attachment`.
- SvelteKit 2 typing: action/load params use `ServerLoad` + `RequestEvent`
  from `@sveltejs/kit` (`PageServerLoad` does not exist).

Decisions already approved by the user (do not re-litigate):

1. Import mode = merge: rows whose `id` already exists are skipped.
2. Scope = everything including AI provider API keys, as one JSON file.
3. JSON for backup/restore; CSV export-only for the transaction report.

Security decisions (approved, with one deliberate exception):

- `ai_providers` (including API keys) and `ai_active_provider` ARE
  included — user explicitly requested it. The UI must carry the warning
  "File backup berisi API key — simpan baik-baik" and the plan's
  acceptance criteria require it.
- `master_password_hash` is NEVER exported or imported. Rationale: a file
  containing the hash is a copy of the account key, and importing someone
  else's hash locks the owner out of their own app.
- `rate_limits` rows are NEVER exported or imported (ephemeral infra state).

## Dependencies

None. Single independent workstream: no sibling plans, no schema change
(no migration needed — no tables/columns are added or altered), no new
npm dependencies (stdlib + existing `zod` only).

## Files / Areas Likely Affected

| File | Change |
|---|---|
| `src/lib/server/db.ts` | Add `exportAllData(db)`, `importBackupData(db, data)` + result-count types. Only file allowed to contain the new SQL. |
| `src/lib/server/db.test.ts` | Extend fake-Db assertions first, then tests for export/import (partitioning, ordering, counts). |
| `src/lib/server/validation.ts` | Add `BackupSchema` (versioned file envelope + per-row schemas, snake_case DB column names). |
| `src/lib/server/validation.test.ts` | Tests for valid file, bad version, bad row, oversized/missing sections. |
| `src/routes/api/backup/export/+server.ts` | **New.** `GET ?format=json\|csv`. JSON: full backup download. CSV: transactions report download. Auth via existing hooks guard (401 when logged out). |
| `src/routes/settings/+page.server.ts` | Add `import-backup` action: multipart upload, size cap, `BackupSchema` validation, calls `importBackupData`, returns `{ inserted, skipped }` or field errors. |
| `src/routes/settings/+page.svelte` | Add "Data" card: two download buttons, upload form + `ConfirmModal` reuse, result/error messages, API-key warning. Indonesian copy. |

## Implementation Steps

### Task 1: `BackupSchema` + tests (TDD, no SQL yet)

Exact backup file shape (snake_case DB column names, no mapping layer):

```json
{
  "version": 1,
  "exportedAt": "2026-09-13T00:00:00.000Z",
  "wallets": [{ "id": "...", "name": "Tunai", "kind": "cash", "created_at": "..." }],
  "transactions": [{ "id": "...", "wallet_id": "...", "to_wallet_id": null, "description": "...", "amount": 50000, "category": "Makanan", "type": "expense", "date": "2026-09-13", "created_at": "...", "updated_at": "..." }],
  "debts": [{ "id": "...", "person": "...", "direction": "owe", "amount": 100000, "paid": 0, "wallet_id": null, "date": "2026-09-13", "created_at": "...", "updated_at": "..." }],
  "debt_payments": [{ "id": "...", "debt_id": "...", "amount": 50000, "wallet_id": "...", "date": "2026-09-13", "created_at": "..." }],
  "ai_providers": [{ "id": "...", "name": "...", "baseUrl": "https://.../v1", "apiKey": "...", "model": "...", "models": ["..."] }],
  "ai_active_provider": "..."
}
```

- `version` is `z.literal(1)` — unknown versions fail with "Format backup tidak didukung".
- Row schemas reuse the existing field constraints (amount int/positive/max
  999_999_999, `kind`/`type`/`direction` enums, `YYYY-MM-DD` date regex
  already in `validation.ts`). IDs are `z.string().min(1)` (opaque).
- Arrays capped for Worker safety (e.g. `.max(20000)` per table; the
  upload action additionally rejects files > 5 MB before parsing).
- `ai_providers` items reuse the same shape as `ProviderFormSchema` output;
  `ai_active_provider` is a plain string (may be `""`).
- Tests in `validation.test.ts`: round-trip valid file passes; wrong
  `version` fails; negative amount fails; bad `type` enum fails;
  missing `wallets` key fails.

### Task 2: `exportAllData(db)` in `db.ts` + fake-Db tests

- New function returning the exact envelope above (minus nothing):
  unbounded `SELECT`s (no `LIMIT`), deterministic order
  (`ORDER BY created_at, id` — document the choice inline).
- Transactions/debts select raw columns (no joined wallet names — the
  importer needs IDs, not display names).
- Providers read via the existing `getProviders` / `getActiveProviderId`
  helpers (reuse, do not re-query `app_settings` by hand).
- `master_password_hash` and `rate_limits` are never selected — add a test
  asserting the export SQL mentions neither key/table.
- Fake-Db first: extend the fake to capture the new prepared statements,
  assert exact SQL strings, then implement.

### Task 3: `importBackupData(db, data)` in `db.ts` + fake-Db tests

Merge algorithm (all steps server-side, inside actions/route only):

1. `SELECT id FROM wallets / transactions / debts / debt_payments` into
   four `Set`s (one cheap query per table).
2. Partition incoming rows: keep only rows whose `id` is not in the set
   (skip = existing). Count both sides per table.
3. Insert new rows with `INSERT OR IGNORE` (belt-and-braces against races),
   parents before children: `wallets` → `transactions` + `debts` →
   `debt_payments`. Chunk `db.batch` calls (max ~50 statements per batch)
   to stay within D1/Worker limits; verify chunk size in preview.
4. Debt invariant (`paid == SUM(debt_payments)`): a payment row is only
   inserted when its `debt_id` was newly inserted in this same import OR
   already exists in DB. If the debt was skipped (pre-existing) but the
   payment is new, insert the payment AND append
   `UPDATE debts SET paid = paid + ? WHERE id = ?` to the same batch.
   Payments whose `debt_id` exists in neither place abort the whole import
   with "Data tidak konsisten" naming the table (fail before any batch
   runs — validate cross-references up front in this function).
5. Providers merge: read current `ai_providers`, union by `id` (existing
   rows win = incoming duplicates skipped), `saveProviders` only when at
   least one new provider was added. `ai_active_provider`: set only when
   the current value is empty and the file has a non-empty one; otherwise
   keep the current value.
6. Return `{ inserted: { wallets, transactions, debts, debt_payments, providers }, skipped: {...} }`.
7. Fake-Db first: assert the partition queries, the `INSERT OR IGNORE`
   statements, batch chunking, and the `paid`-increment update. Test the
   tricky case explicitly: pre-existing debt + new payment ⇒ payment
   inserted + `paid` incremented.

### Task 4: `GET /api/backup/export` route (JSON + CSV download)

- `GET ?format=json` (default): `exportAllData(db)` →
  `Content-Type: application/json`,
  `Content-Disposition: attachment; filename="digital-wallet-backup-YYYY-MM-DD.json"`.
- `GET ?format=csv`: transactions report only. Columns:
  `date,description,category,type,amount,wallet_id,to_wallet_id`.
  Reuse the existing `listTransactions` filter params (`month`, `walletId`,
  `search`, `category`) with a documented cap (`limit` max 5000);
  default = current month when `month` is absent (same convention as the
  transactions page). CSV escaping helper (`toCsvField`: quote when the
  value contains `,"` or newline) lives in this route file — it is 5 lines,
  not a new module (`ponytail:` single-route helper, extract to `lib/`
  only if a second CSV consumer ever appears). `Content-Type: text/csv`,
  `filename="transaksi-YYYY-MM.csv"`.
- Unknown `format` ⇒ 400 JSON `{ error }`. No `Origin` check needed (GET,
  read-only, no mutation). Auth comes free from `hooks.server.ts` (401
  when logged out) — verify manually in preview.
- Filenames use ASCII only (no spaces) to avoid header-encoding issues.

### Task 5: `import-backup` action + Settings "Data" UI

- Action `import-backup` in `settings/+page.server.ts`: read multipart
  `file` field; reject missing file ("Pilih file backup dulu"); reject
  size > 5 MB ("File terlalu besar"); `JSON.parse` in try/catch
  ("File bukan JSON yang valid"); `BackupSchema.safeParse` ⇒
  `fieldErrors` on failure; call `importBackupData`; return the
  inserted/skipped counts. `use:enhance` + `invalidateAll()` like the
  other settings forms (no hand-rolled fetch).
- UI: new `<section class="card">` "Data" in `settings/+page.svelte`
  between the AI section and the Sesi section: download JSON link
  (`<a href="/api/backup/export?format=json">`), download CSV link,
  upload form (`accept="application/json"`, `ConfirmModal` reuse with
  "Impor backup? Data yang sudah ada tidak akan dihapus."),
  warning paragraph "File backup berisi API key — simpan baik-baik.",
  success line "Impor selesai: X baru, Y dilewati." All copy Indonesian,
  reuse `.btn .input .label` utilities, dark-mode classes like siblings.

### Task 6: Verify + harden

- `npm run check && npm run test` green.
- `npm run preview` manual pass (runtime-sensitive: real D1 file download,
  5 MB rejection, Worker batch limits): export JSON → wipe local D1 →
  import → counts correct → balances identical (computed balances must not
  drift); CSV opens in a spreadsheet; logged-out `/api/backup/export`
  returns 401, not a redirect.
- Confirm no secrets leak: open the JSON file, assert no
  `master_password_hash` key anywhere.

## Acceptance Criteria

1. Logged-in user downloads a `.json` backup from Settings; the file
   parses, has `version: 1`, all 7 top-level keys, and contains zero
   occurrences of `master_password_hash` / `rate_limits`.
2. Importing that file into an empty DB restores identical wallet
   balances, transaction counts, open-debt remaining amounts, and AI
   provider list (dashboard + analytics + hutang pages match pre-wipe).
3. Re-importing the same file imports 0 rows and reports every row as
   skipped (idempotent merge).
4. Partial overlap (fresh export after new transactions) imports only the
   new rows; pre-existing debt + new payment keeps
   `paid == SUM(debt_payments)` (verified via hutang page remaining).
5. Malformed file (bad JSON, `version: 2`, negative amount, payment
   pointing at a missing debt, > 5 MB) is rejected with an Indonesian
   error message and zero rows are written.
6. CSV download contains the filtered transactions with correct escaping
   (a description containing `,"` survives a spreadsheet round-trip).
7. Logged-out `GET /api/backup/export` returns 401 JSON (not a redirect).
8. `npm run check && npm run test` pass; no new dependencies in
   `package.json`.

## Verification / Tests

- Unit (vitest, node env): `validation.test.ts` (BackupSchema accept/reject
  matrix), `db.test.ts` (fake-Db SQL assertions for export selects,
  partition queries, `INSERT OR IGNORE` batches, `paid`-increment update),
  CSV escaping cases for the route-file helper.
- Manual (preview, local D1): the Task 6 checklist above, including the
  nuke-and-restore cycle
  (`npx wrangler d1 execute digital-wallet-db --local --file=schema.sql`
  after deleting `.wrangler/state/`, per `docs/development.md`).
- No live-D1 tests ever; `--remote` is never touched by this workstream.

## Git

Branch: `feature/backup-restore` (cut from `main`, single builder session).

Commit rhythm: one commit per Task above (tests → implement → verify),
conventional messages, e.g. `feat: validate backup file envelope`,
`feat: export all tables to JSON`, `feat: merge backup import`,
`feat: backup download endpoint`, `feat: settings data section`.

## Integration Notes

No sibling plans and no shared-schema changes: this is the only active
workstream, so there is no merge order and no expected conflicts beyond
normal `main` drift. The builder session owns the branch end-to-end and
does NOT merge — after green verification the user runs `/integrate`
from `main`. Do not touch `migrations/` or `schema.sql`.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| Task 1 (BackupSchema + tests) | tester | A | Pure validation logic, zero shared state with DB/API work; TDD-first |
| Task 2 recon (export query shapes) | reviewer | A | Read-only recon of `db.ts` export surface, parallel to Task 1 |
| Task 2 (exportAllData + fake-Db) | builder | — | Inline: needs current session context, touches load-bearing `db.ts` |
| Task 3 (importBackupData + fake-Db) | builder | — | Inline: sequential on Task 2 (same file, merge logic builds on export shapes) |
| Task 4 (export route JSON+CSV) | builder | — | Inline: thin glue over Tasks 2–3, needs their exact signatures |
| Task 5 (action + Settings UI) | designer | B | UI work in `+page.svelte`, no shared state with Task 6 checks |
| Task 6 (check/test/preview pass) | tester | B | Independent verification run, parallel to UI build |
| Final review of diff | reviewer | — | Read-only review gate before handoff to `/integrate` |

Batch A = one message (Task 1 + Task 2 recon). Batch B = one message
(Task 5 + Task 6). Builder executes Tasks 2–4 inline in order (shared
`db.ts` state). Reviewer is read-only and never mutates code.
