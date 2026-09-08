# Implementation Plan: UX Data Model — Tanggal Transaksi, Transfer, Copilot Edit, List & Analitik

> **For agentic workers:** REQUIRED: execute task-by-task (subagent-per-task per Delegation Strategy, or plans skill execute mode). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Perbaiki 5 masalah UX fungsional hasil critique 2026-09-08: tidak ada tanggal transaksi, tidak ada transfer antar dompet (top-up merusak saldo), preview copilot tidak bisa diedit, list transaksi mentok 50 tanpa cari/filter kategori, analitik persen menyesatkan + tanpa breakdown dompet.

**Architecture:** SvelteKit (Svelte 5 runes) + Cloudflare Worker + D1 (SQLite). Semua saldo computed dari transaksi (`SUM CASE`) — tidak ada kolom balance. Money path divalidasi zod di `validation.ts` (single source of truth). TDD: vitest dengan fakeDb pattern (lihat `src/lib/server/db.test.ts:4-13`).

**Tech Stack:** SvelteKit 2, Svelte 5, Tailwind v4, zod 3, vitest 3, wrangler 4, D1 `digital-wallet-db` (id `a6c5170a-84d4-4077-9670-5dadeac0eba5`).

## Global Constraints

- Identifier/komentar kode English; UI copy Indonesian (bahasa app).
- Native platform first: `<input type="date">` bukan picker lib; SQL constraint bukan validasi app; tidak ada dependency baru.
- Kategori tetap 8 hardcoded (`src/lib/constants.ts`) — CRUD kategori = non-goal.
- UI visual (warna/spacing/typografi) di luar scope — user explicit. Ikuti pola kelas yang ada.
- Data prod = smoke test saja; migration boleh rebuild tabel tapi harus preserve rows.
- Copy error/label: pendek, Indonesia, konsisten ("Catat" untuk tambah transaksi di semua halaman).
- `ponytail:` comment untuk shortcut sadar (lihat Task 1 Step 1 catatan timezone).

## Scope decisions (user approved "fix semua", 2026-09-08)

1. **Tanggal transaksi**: kolom `date TEXT` (YYYY-MM-DD) di transactions; form manual + edit + AI parse + copilot bulk mendukung; filter bulan pakai `date`, bukan `created_at`.
2. **Transfer**: tipe ketiga `transfer` + `to_wallet_id`. Transfer mengurangi saldo `wallet_id`, menambah `to_wallet_id`, **dikecualikan** dari semua agregat income/expense (summary, kategori, tren). AI tidak mem-parse transfer (tetap income/expense saja). Ini merevisi non-goal spec `docs/specs/2026-09-08-digital-wallet-design.md` atas persetujuan user.
3. **Copilot preview**: tiap baris hasil parse bisa diedit inline (deskripsi, nominal, dompet, kategori, tanggal) sebelum Simpan.
4. **List transaksi**: filter kategori + pencarian teks + "Muat lebih" (offset), semua via query param.
5. **Analitik**: persen = porsi dari total per tipe (bukan rasio ke kategori terbesar); tambah section pengeluaran per dompet bulan terpilih.
6. Minor ikut: label "Tambah"→"Catat"; empty state format bulan "September 2026" bukan "2026-09"; baris dompet di Beranda diklik → filter transaksi dompet itu; Beranda dapat month picker.

**Non-goals (defer, satu baris alasan):** export CSV (bukan fix UX), CRUD kategori (fitur baru), auto-lock session (tradeoff keamanan, belum diminta), budget (butuh brainstorm sendiri), logout/theme mobile (ada di plan `ux-mobile-settings.md`).

## Dependencies

- Tidak ada dependency npm baru. zod sudah support `.default()`/`.refine()`.
- Migration D1 harus jalan lokal + remote sebelum UI diuji (`wrangler d1 execute`).
- Reviewer subagent pernah gagal dispatch (kredensial gmicloud) → fallback review inline.

## Files / Areas Likely Affected

- `schema.sql` — tabel transactions bentuk baru (fresh install)
- `migrations/001-tx-date-transfer.sql` — baru: rebuild tabel, preserve data
- `src/lib/server/db.ts` — TxRow/TxInput, BALANCE_SQL, getKindTotals, listTransactions, create/update, getMonthlySummary, getCategoryTotals, getMonthlyTotals, deleteWallet guard, +getWalletTotals baru
- `src/lib/server/validation.ts` — TxSchema +date +transfer +refine
- `src/lib/format.ts` — helper `todayISO()` (WIB)
- `src/lib/server/ai.ts` — parse schema + prompt date; `src/routes/api/ai/parse/+server.ts` — passthrough
- `src/lib/components/TransactionForm.svelte` — 3 tipe, date, dompet tujuan
- `src/routes/transactions/+page.svelte|+page.server.ts` — filter cari/kategori/muat-lebih, badge transfer, label
- `src/routes/copilot/+page.svelte|+page.server.ts` — preview editable, BulkSchema +date
- `src/routes/analytics/+page.svelte|+page.server.ts` — persen + breakdown dompet
- `src/routes/+page.svelte|+page.server.ts` (Beranda) — month picker, wallet row link, format bulan
- Tests: `db.test.ts`, `validation.test.ts`, `ai.test.ts`

## Implementation Steps

### Task 1: Schema + migration + layer db (owner: builder, inline — money path, butuh konteks penuh)

- [ ] **Step 1: Tulis `migrations/001-tx-date-transfer.sql`**

```sql
-- Rebuild transactions: add date + to_wallet_id + transfer type. Preserves rows.
BEGIN;
CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  to_wallet_id TEXT REFERENCES wallets(id),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT DEFAULT 'Lainnya',
  type TEXT DEFAULT 'expense' CHECK (type IN ('income','expense','transfer')),
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO transactions_new (id, wallet_id, to_wallet_id, description, amount, category, type, date, created_at, updated_at)
SELECT id, wallet_id, NULL, description, amount, category, type, substr(created_at, 1, 10), created_at, updated_at
FROM transactions;
DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
COMMIT;
```

`ponytail:` backfill `substr(created_at,1,10)` pakai UTC — baris jam 17:00–23:59 WIB mendarat di tanggal sebelumnya. Ceiling: cuma data smoke; jangan dipakai untuk laporan resmi.

- [ ] **Step 2: Update `schema.sql`** — blok tabel transactions identik dengan `transactions_new` di atas (nama `transactions`), + index `idx_transactions_date`. Seed wallets tetap.
- [ ] **Step 3: Terapkan lokal**: `npx wrangler d1 execute digital-wallet-db --local --file=migrations/001-tx-date-transfer.sql`. Verifikasi: `npx wrangler d1 execute digital-wallet-db --local --command "SELECT count(*) FROM transactions"`. (Remote dijalankan builder setelah merge, lihat Integration Notes.)
- [ ] **Step 4: Failing tests** di `db.test.ts` (pola fakeDb yang ada):
  - `getKindTotals` tetap memetakan rows (regresi).
  - `listTransactions` dengan `opts.search`/`opts.category` menghasilkan SQL berisi `t.description LIKE ?` dan `t.category = ?` — assert lewat fakeDb yang merekam SQL (pola `calls.push(sql)` di test deleteWallet).
  - `deleteWallet` guard: SQL usage check berisi `to_wallet_id`.
- [ ] **Step 5: Implementasi `db.ts`:**
  - `TxRow`: tambah `to_wallet_id: string | null; dest_wallet_name: string | null; date: string;` dan `type: 'income' | 'expense' | 'transfer'`.
  - `TxInput`: tambah `date: string; to_wallet_id?: string | null;` (type ikut union baru).
  - `BALANCE_SQL` + query `getKindTotals`: join `LEFT JOIN transactions t ON t.wallet_id = w.id OR t.to_wallet_id = w.id`, CASE:

```sql
COALESCE(SUM(CASE
  WHEN t.type = 'income' THEN t.amount
  WHEN t.type = 'expense' THEN -t.amount
  WHEN t.type = 'transfer' AND t.wallet_id = w.id THEN -t.amount
  WHEN t.type = 'transfer' AND t.to_wallet_id = w.id THEN t.amount
  ELSE 0 END), 0) AS balance
```

  - `listTransactions`: select `t.*, w.name AS wallet_name, w.kind AS wallet_kind, w2.name AS dest_wallet_name` + `LEFT JOIN wallets w2 ON w2.id = t.to_wallet_id`; filter bulan → `t.date LIKE ?`; tambah `opts.search` (`t.description LIKE ?`, bind `%${search}%`) dan `opts.category` (`t.category = ?`); `ORDER BY t.date DESC, t.created_at DESC`.
  - `createTransaction`/`createTransactions`: insert `date` (default `new Date().toISOString().slice(0,10)` bila kosong) dan `to_wallet_id` (null bila bukan transfer).
  - `updateTransaction`: terima `date` + `to_wallet_id`.
  - `getMonthlySummary`/`getCategoryTotals`: `WHERE date LIKE ? AND type != 'transfer'`.
  - `getMonthlyTotals`: `substr(date,1,7) AS month`, `WHERE date >= ? AND type != 'transfer'`.
  - `deleteWallet`: usage → `WHERE wallet_id = ? OR to_wallet_id = ?`.
  - Baru: `getWalletTotals(db, month): Promise<{ id: string; name: string; kind: 'digital' | 'cash'; total: number }[]>` — pengeluaran per dompet:

```sql
SELECT w.id, w.name, w.kind, COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total
FROM wallets w LEFT JOIN transactions t ON t.wallet_id = w.id AND t.date LIKE ?
GROUP BY w.id ORDER BY total DESC
```

- [ ] **Step 6:** `npm test` hijau. `git commit -m "feat(db): transaction date and transfer type with computed balances"`.

### Task 2: Validasi + AI (owner: builder, inline — money/security path, setelah Task 1)

- [ ] **Step 1: Failing tests** `validation.test.ts`: date kosong → default hari ini (WIB); date `'2026-13-40'` → error `Tanggal tidak valid`; `type:'transfer'` tanpa `toWalletId` → error path `toWalletId`; transfer `toWalletId === walletId` → error; income/expense mengabaikan `toWalletId`. `ai.test.ts`: `normalizeItem` mengisi date default; `buildParsePrompt` berisi instruksi `date`.
- [ ] **Step 2: `src/lib/format.ts`** tambah:

```ts
/** Today's calendar date (YYYY-MM-DD) in WIB. */
export function todayISO(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
```

- [ ] **Step 3: `validation.ts` TxSchema:**

```ts
export const TxSchema = z
	.object({
		walletId: z.string().trim().min(1, 'Pilih dompet dulu'),
		toWalletId: z.string().trim().default(''),
		description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
		amount: z.coerce.number().int('Jumlah harus bilangan bulat').positive('Jumlah harus lebih dari 0').max(999_999_999, 'Jumlah terlalu besar'),
		category: z.string().trim().min(1).default('Lainnya'),
		type: z.enum(['income', 'expense', 'transfer'], { message: 'Tipe tidak valid' }),
		date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').default(() => todayISO())
	})
	.refine((t) => t.type !== 'transfer' || (t.toWalletId !== '' && t.toWalletId !== t.walletId), {
		message: 'Pilih dompet tujuan yang berbeda',
		path: ['toWalletId']
	});
```

  Catatan: `fieldErrors()` sudah memetakan issue pertama per path — `toWalletId` ikut otomatis.
- [ ] **Step 4: `ai.ts`:** `TransactionSchema` + `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()`; `normalizeItem` → `date: it.date ?? todayISO()` (import dari `$lib/format`); interface `ParsedTransaction` + `date: string`. `buildParsePrompt`: format line tambah `"date": string (YYYY-MM-DD)`; bullet baru: `- date: resolve relative words ("kemarin", "tadi pagi", "3 hari lalu", "tanggal 5") against Current time (WIB). Omit if the text has no time hint.` Type tetap hanya income/expense.
- [ ] **Step 5: `routes/api/ai/parse/+server.ts`:** pastikan field `date` ikut di respons (cek file; kalau meremap field eksplisit, tambahkan `date`).
- [ ] **Step 6:** `npm test` hijau. Commit `feat(validation,ai): date and transfer schema with AI date extraction`.

### Task 3: TransactionForm + halaman Transaksi (owner: designer, batch A)

Berkas: `src/lib/components/TransactionForm.svelte`, `src/routes/transactions/+page.svelte`, `src/routes/transactions/+page.server.ts`. Jangan sentuh copilot/analytics/beranda (task lain di batch yang sama).

- [ ] **Step 1: Form** — tipe jadi 3 tombol `grid-cols-3` (Pengeluaran merah / Pemasukan hijau / Transfer sky, ikon `ArrowLeftRight` lucide); field **Tanggal** `<input type="date" name="date">` default `todayISO()`; saat `type==='transfer'` tampilkan select **Dompet tujuan** (`name="toWalletId"`, optgroup per kind, exclude wallet sumber); error `errors.toWalletId` tampil di bawah select. Edit mode: isi dari `transaction.date` dan `transaction.to_wallet_id`.
- [ ] **Step 2: List** — baris transfer: badge `→ {tx.dest_wallet_name}` (gaya sama dengan badge wallet); tanggal tampil `formatDate(tx.date)` (bukan created_at); tombol header "Tambah" → "Catat".
- [ ] **Step 3: Filter** — form GET tambah `<input type="search" name="q">` (placeholder "Cari deskripsi…") + `<select name="category">` (opsi `CATEGORIES` dari `$lib/constants`, default kosong = Semua); link "Muat lebih" `?offset={transactions.length + 50}` mempertahankan semua param lain; server load baca `q`, `category`, `offset` (parseInt, default 0) → teruskan ke `listTransactions` (`search`, `category` baru; `offset` sudah ada). Reset link menghapus semua.
- [ ] **Step 4: Empty state** — `Belum ada transaksi untuk {Bulan YYYY}` pakai `Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'})` (pola `+page.svelte:35` Beranda), bukan `data.month` mentah.
- [ ] **Step 5: `npm run check` + manual `npm run dev`**: buat transfer Tunai→GoPay, cek saldo kedua bergeser simetris & Pemasukan/Pengeluaran Beranda tidak berubah. Commit `feat(ui): date and transfer in transaction form, search category pagination in list`.

### Task 4: Copilot preview editable (owner: designer, batch A)

Berkas: `src/routes/copilot/+page.svelte`, `src/routes/copilot/+page.server.ts` saja.

- [ ] **Step 1: `BulkSchema`** (`+page.server.ts`) tambah `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`; type tetap enum income/expense (AI tidak menghasilkan transfer).
- [ ] **Step 2: Preview rows** — ganti label statis jadi baris field compact: `<input type="text">` deskripsi, `<input type="number">` nominal, `<select>` dompet (optgroup per kind, pola TransactionForm), `<select>` kategori, `<input type="date">`, toggle tipe 2 tombol kecil. `previews` sudah `$state` — bind langsung. `selectedItems` tetap JSON dari state → kontrak tombol Simpan tidak berubah.
- [ ] **Step 3: Manual**: parse "beli kopi 25rb kemarin" → preview bertanggal kemarin → edit nominal → simpan → cek di Transaksi. Commit `feat(copilot): editable parse preview rows with date`.

### Task 5: Analitik + Beranda (owner: designer, batch A)

Berkas: `src/routes/analytics/+page.svelte|+page.server.ts`, `src/routes/+page.svelte|+page.server.ts`.

- [ ] **Step 1: Persen** — `analytics/+page.svelte`: hitung total per tipe dari `data.categoryTotals`; `pct = Math.round(cat.total / (sumByType[cat.type] || 1) * 100)`; bar width basis sama. Label `{pct}%` kini benar: porsi pengeluaran/pemasukan.
- [ ] **Step 2: Breakdown dompet** — server load kirim `walletTotals = await getWalletTotals(db, month)`; section baru "Pengeluaran per Dompet" pakai pola bar horizontal yang sama (warna netral, bukan merah).
- [ ] **Step 3: Beranda** — load terima `?month=` (regex `^\d{4}-\d{2}$`, default bulan ini) → `getMonthlySummary(db, month)`; header tambah month input GET-form (pola analytics `+page.svelte:37-47`). Saldo (totals/wallets) tetap all-time — benar, itu saldo sekarang. Baris dompet jadi `<a href="/transactions?wallet={w.id}">` (gaya row tetap, tambah hover). Recent list: badge transfer `→ dest` ikut pola Task 3.
- [ ] **Step 4: `npm run check`** + verifikasi persen manual satu bulan. Commit `feat(analytics,home): share-of-total percent, per-wallet breakdown, month picker`.

### Task 6: Review + verifikasi akhir (owner: reviewer, batch B — setelah A)

- [ ] Reviewer dispatch: diff branch vs main, fokus money path (SQL balance, validasi transfer, BulkSchema). **Fallback:** dispatch gagal (kredensial) → builder review inline terhadap checklist: saldo transfer simetris (sumber −, tujuan +, total gabungan tidak berubah), semua agregat exclude transfer, semua caller `listTransactions` cocok dengan signature baru, tidak ada field hilang di edit.
- [ ] `npm test && npm run check && npm run build` hijau.
- [ ] Smoke manual `npm run dev`: catat → transfer → filter+cari+muat lebih → copilot parse+edit → analitik → beranda bulan lalu.

## Acceptance Criteria

1. Transaksi baru/edit punya tanggal yang bisa dipilih; default hari ini (WIB); filter bulan Transaksi/Analitik/Beranda mengikuti `date`, bukan waktu insert.
2. AI parse menghasilkan tanggal konkret untuk "kemarin/tadi pagi"; tanggal tak valid → fallback hari ini.
3. Transfer di form: sumber + tujuan wajib beda; saldo kedua dompet bergeser simetris; total gabungan tidak berubah; tidak masuk Pemasukan/Pengeluaran/kategori/Tren.
4. Preview copilot: semua field bisa diedit sebelum simpan; hasil simpan memakai tanggal preview.
5. List transaksi: >50 item diakses via Muat lebih; pencarian + filter kategori bekerja dan kombinasinya bertahan di URL.
6. Persen analitik = porsi total per tipe; ada breakdown pengeluaran per dompet.
7. Beranda: month picker berfungsi; baris dompet mengarah ke transaksi terfilter dompet itu; label "Catat" konsisten.

## Verification / Tests

- `npm test` — unit: db (SQL shape + mapping), validation (date/transfer rules), ai (date contract).
- `npm run check` — types. `npm run build` — production build.
- Manual E2E Task 6 step 3.
- `npx wrangler d1 execute digital-wallet-db --local --command "SELECT type, count(*) FROM transactions GROUP BY type"` — transfer tercatat sebagai tipe sendiri.

## Git (branch: feature/ux-data-model)

- Branch dari `main` terbaru. Commit per task (conventional, English). Push + merge `--no-ff` ke `main` setelah Task 6 hijau (pola rilis v1.0-wallet).
- File migration ikut commit; hasil execute lokal tidak masuk repo.

## Integration Notes

- **Urutan merge:** `feature/ux-mobile-settings` (plan kecil) digabung **lebih dulu** — tidak ada tumpang tindih file; menghindari rebase `+layout.svelte`/settings.
- Deploy = Workers Builds (auto saat push main). **Jalankan migration `--remote` sebelum merge ke main** (UI baru mengharapkan kolom `date`/`to_wallet_id`; worker lama tetap jalan dengan kolom yang ada → urutan aman: migrate remote → merge).
- `schema.sql` berubah → fresh install langsung bentuk baru; migration hanya untuk DB existing.
- Setelah merge: `graphify update .` bila hook tidak menangani.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 Schema+db | builder | – (sequential) | Money path inti; semua task konsumsi signature ini |
| 2 Validasi+AI | builder | – (setelah 1) | Security/validasi, butuh konteks Task 1 |
| 3 Form+Transaksi | designer | A | UI-heavy, file terisolasi |
| 4 Copilot | designer | A | File terisolasi (`copilot/*`) |
| 5 Analitik+Beranda | designer | A | File terisolasi (`analytics/*`, root page) |
| 6 Review | reviewer | B (setelah A) | Read-only gate money path; fallback inline (credential issue) |

Batch A = Task 3,4,5 dispatch dalam satu pesan setelah Task 1–2 commit. Task 3–5 tidak saling sentuh file; larangan keras: desainer tidak mengubah `db.ts`/`validation.ts` (akses lewat fungsi Task 1).
