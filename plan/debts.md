# Implementation Plan: Fitur Hutang — Utang/Piutang Dua Arah dengan Cicilan Parsial terintegrasi Dompet

> **For agentic workers:** REQUIRED: execute task-by-task (subagent-per-task per Delegation Strategy, atau plans skill execute mode). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tambah fitur hutang: catat utang (kamu berutang) DAN piutang (orang berutang ke kamu), dua arah; cicilan parsial (bayar sebagian, sisa berkurang, atau langsung lunas); tanpa jatuh tempo; terintegrasi dengan dompet — setiap pergerakan uang otomatis jadi transaksi (saldo computed tetap satu sumber kebenaran).

**Architecture:** SvelteKit (Svelte 5 runes) + Cloudflare Worker + D1. Pola saldo computed (`SUM CASE`, tidak ada kolom balance). Money path divalidasi zod di `validation.ts`. TDD: vitest dengan fakeDb pattern (`src/lib/server/db.test.ts:4-13`).

**Tech Stack:** SvelteKit 2, Svelte 5, Tailwind v4, zod 3, vitest 3, wrangler 4, D1 `digital-wallet-db` (id `a6c5170a-84d4-4077-9670-5dadeac0eba5`). Lucide icons. Tanpa dependency baru.

## Global Constraints

- Identifier/komentar kode English; UI copy Indonesian.
- **Assumed base state (WAJIB sudah merge sebelum branch ini dibuat):** `feature/ux-mobile-settings` DAN `feature/ux-data-model` sudah di `main`. Invariant yang plan ini andalkan dari ux-data-model:
  - `transactions` punya kolom `date TEXT` (YYYY-MM-DD) dan tipe `'transfer'`.
  - `TxSchema` punya `date` (default `todayISO()`) dan `toWalletId`; `todayISO()` ada di `$lib/format.ts` (WIB).
  - `listTransactions` signature: `{ limit, offset, month, walletId, search, category }`; filter bulan pakai `t.date LIKE ?`.
  - `getMonthlySummary`/`getCategoryTotals` exclude `transfer`.
  - Pola select dompet optgroup (digital/cash) ada di TransactionForm — ditiru modal hutang.
  - `+layout.svelte` tidak lagi import `ThemeToggle` (dibersihkan ux-mobile-settings).
- Native/simple first: checkbox tanpa JS kompleks, `<input type="date">`, SQL check constraint.
- Tabel `debts` TIDAK menyentuh tabel `transactions`/`wallets` yang ada — hanya tabel baru + fungsi baru di `db.ts`.
- Semua pergerakan uang hutang lewat SATU jalur kode: `addDebtPayment` (insert payment + insert transaction + db.batch). Invariant: `debts.paid == SUM(debt_payments.amount)` per debt.
- `ponytail:` comment untuk shortcut sadar (bila ada).

## Scope decisions (user approved via brainstorming, 2026-09-08)

1. **Dua arah** (`direction`): `'owe'` = aku berutang (utang), `'owed'` = orang berutang ke aku (piutang). List menampilkan keduanya dengan badge.
2. **Cicilan parsial**: bayar sebagian kapan saja, `paid` bertambah, `remaining = amount - paid` otomatis. Lunas = `remaining == 0` (derived, tanpa kolom status).
3. **Tanpa jatuh tempo** (user explicit) — tidak ada kolom due date.
4. **Integrasi dompet, kebijakan C** (user explicit):
   - Catat utang baru: checkbox **"Langsung kurangi saldo"** mengendalikan apakah uang bergerak saat pencatatan.
     - Centang → saldo langsung berubah (`owe`→expense, `owed`→income, nominal penuh, dompet yang dipilih di form), dan utang langsung dianggap lunas-cicil (lihat kode path di Task 1).
     - Tidak centang → catatan murni, saldo tidak berubah.
   - Bayar cicilan/lunas: SELALU mengubah saldo, dompet dipilih saat bayar.
   - Form catat utang selalu punya pilihan **dompet** (digital/cash, optgroup) — dipakai baik untuk "langsung kurangi" maupun default saran saat bayar.
5. **Transaksi otomatis** yang dibuat jalur hutang memakai kategori `'Lainnya'`, deskripsi konvensi: `Pinjam dari {person}` (catat owe + kurangi saldo), `Pinjamkan ke {person}` (catat owed + kurangi saldo), `Bayar utang ke {person}` (cicilan owe), `Terima bayaran dari {person}` (cicilan owed). Transaksi ini muncul normal di daftar/analitik — tidak ada flag khusus.
6. **Delete**: hanya diizinkan saat debt belum punya payment (belum ada uang bergerak). Ada payment → tolak dengan pesan; cara menutup = bayar sisa sampai lunas (anti korup riwayat transaksi).
7. **Nav item baru "Hutang"** (icon `HandCoins`), sidebar + bottom nav; bottom nav mobile `grid-cols-6` → `grid-cols-7` (item lebih ramping, teks `text-[10px]`).
8. **Beranda**: kartu ringkas `Hutang` (total owe terbuka) + `Piutang` (total owed terbuka) → link `/hutang`.

**Non-goals (defer, satu baris alasan):** edit utang (YAGNI, hapus+catat ulang), template utang berulang (bulan, kontrakan — belum diminta), jatuh tempo/reminder (user skip), bunga/denda (tidak diminta), import/export hutang (suara global), link balik transaksi↔hutang (transaksi generated tidak perlu FK).

## Dependencies

- Branch ini WAJIB dibangun di atas `main` yang sudah berisi merge kedua plan UX sebelumnya (lihat Global Constraints).
- Tidak ada dependency npm baru.
- Cloudflare: user sudah `wrangler login` (OAuth) → builder bisa `wrangler d1 execute --remote` untuk migration 002 SEBELUM merge (pola Integration Notes ux-data-model).
- Reviewer subagent pernah gagal dispatch (kredensial gmicloud) → fallback review inline (checklist di Task 4).

## Files / Areas Likely Affected

- `migrations/002-debts.sql` — baru (rebuild tidak perlu; tabel baru)
- `schema.sql` — tambah blok tabel `debts` + `debt_payments` + index (fresh install)
- `src/lib/server/db.ts` — `DebtRow`/`DebtPaymentRow`, `listDebts`, `listOpenDebts`, `getDebt`, `createDebt`, `addDebtPayment`, `deleteDebt`, `getDebtDirectionTotals`
- `src/lib/server/validation.ts` — `DebtSchema`, `DebtPaymentSchema`
- `src/lib/components/Navigation.svelte` — item nav + `grid-cols-7`
- `src/routes/hutang/+page.svelte|+page.server.ts` — baru (halaman hutang)
- `src/routes/+page.svelte|+page.server.ts` — kartu ringkas hutang (file sudah berubah oleh ux-data-model — integrate hati-hati)
- Tests: `db.test.ts`, `validation.test.ts`

## Implementation Steps

### Task 1: Migration + schema + layer db (owner: builder, inline — money path inti)

- [ ] **Step 1: Tulis `migrations/002-debts.sql`**

```sql
-- Debts: two-way (owe/owed) with partial payments. Never touches transactions/wallets.
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  person TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('owe','owed')),
  amount REAL NOT NULL CHECK (amount > 0),
  paid REAL NOT NULL DEFAULT 0 CHECK (paid >= 0),
  wallet_id TEXT REFERENCES wallets(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  debt_id TEXT NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount > 0),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debts_direction ON debts(direction);
```

- [ ] **Step 2: `schema.sql`** — tambah blok sama persis di akhir (fresh install langsung punya tabel ini). Seed wallets tetap.
- [ ] **Step 3: Terapkan lokal**: `npx wrangler d1 execute digital-wallet-db --local --file=migrations/002-debts.sql`. Verifikasi: `npx wrangler d1 execute digital-wallet-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('debts','debt_payments')"`. Remote dijalankan builder setelah Task 4 hijau, SEBELUM merge (Integration Notes).
- [ ] **Step 4: Failing tests** di `db.test.ts` (pola fakeDb yang ada; tambahkan `batch` ke fake karena `addDebtPayment`/`createDebt` memakainya):
  - `listDebts` memetakan rows + menghitung `remaining = amount - paid` (fakeDb rows).
  - `listOpenDebts` menghasilkan SQL berisi `d.amount > d.paid` (fakeDb perekam SQL, pola `calls.push(sql)` di test deleteWallet).
  - `addDebtPayment` menolak overpay: fakeDb `first` mengembalikan debt dengan `remaining` kecil → hasil `'overpay'`, dan `batch` TIDAK dipanggil.
  - `addDebtPayment` sukses → `batch` dipanggil dengan 2 statement (insert payment + insert transaction).
  - `deleteDebt` menolak saat ada payment (`'has-payments'`), menghapus saat bersih (`'deleted'`).
  - `createDebt` tanpa reduceBalance → batch tidak dipanggil; dengan reduceBalance → batch dipanggil 2 statement (insert debt + insert transaction, dan `paid` di-set penuh).
- [ ] **Step 5: Implementasi `db.ts`:**

```ts
export interface DebtRow {
  id: string; person: string;
  direction: 'owe' | 'owed';
  amount: number; paid: number; remaining: number;
  wallet_id: string | null; wallet_name: string | null;
  date: string; created_at: string; updated_at: string;
}
export interface DebtPaymentRow {
  id: string; debt_id: string; amount: number;
  wallet_id: string; wallet_name: string; date: string;
}
```

  - `listDebts(db): Promise<DebtRow[]>` — `SELECT d.*, w.name AS wallet_name, (d.amount - d.paid) AS remaining FROM debts d LEFT JOIN wallets w ON w.id = d.wallet_id ORDER BY d.date DESC, d.created_at DESC`. Map `Number()` pada amount/paid/remaining.
  - `listOpenDebts(db): Promise<DebtRow[]>` — sama + `WHERE d.amount > d.paid` (dipakai AI chatbox plan berikutnya — jangan rename).
  - `getDebt(db, id): Promise<DebtRow | null>` — `first` dari query listDebts + `WHERE d.id = ?`.
  - `createDebt(db, input: { person; direction; amount; date; walletId: string | null; reduceBalance: boolean }): Promise<string>` — insert debt dengan `paid = reduceBalance ? amount : 0`. Kalau `reduceBalance` true, lanjut `addDebtPaymentInternal` (lihat bawah) nominal penuh dari `walletId` — hasil `id` debt. **Jangan** pakai dua jalur; reduceBalance = catat + payment penuh sekali jalan.
  - `addDebtPayment(db, input: { debtId; amount; walletId; date }): Promise<'ok' | 'overpay' | 'not-found' | { id: string }>` — real: fetch debt (`getDebt`), null → `'not-found'`; `amount > remaining` → `'overpay'`; else `db.batch([insert debt_payments, insert transactions])`:
    - payment: `(id, debt_id, amount, wallet_id, date)`
    - transaction: `(id, wallet_id, description, amount, category='Lainnya', type, date)` — `type = debt.direction === 'owe' ? 'expense' : 'income'`; desc `debt.direction === 'owe' ? \`Bayar utang ke ${debt.person}\` : \`Terima bayaran dari ${debt.person}\``; `wallet_id` = param; `date` = param.
    - lalu `UPDATE debts SET paid = paid + ?, updated_at = datetime('now') WHERE id = ?`.
    - Semua dalam satu `db.batch([...3 stmts])`. Return `{ id: debtId }`.
  - `deleteDebt(db, id): Promise<'deleted' | 'has-payments' | 'not-found'>` — `SELECT COUNT(*) AS n FROM debt_payments WHERE debt_id = ?`; n>0 → `'has-payments'`; else `DELETE FROM debts WHERE id = ?` → changes>0 ? `'deleted'` : `'not-found'`.
  - `getDebtDirectionTotals(db): Promise<{ owe: number; owed: number }>` — dari `listOpenDebts`, sum `remaining` per direction di JS (data kecil; satu query cukup).
- [ ] **Step 6:** `npm test` hijau. Commit `feat(db): debts with partial payments and wallet integration`.

### Task 2: Validasi (owner: builder, inline — money path, setelah Task 1)

- [ ] **Step 1: Failing tests** `validation.test.ts`:
  - `DebtSchema` tolak person kosong; tolak amount ≤ 0; tolak date malformed; tolak direction bukan owe/owed.
  - `DebtSchema` dengan `reduceBalance: 'on'` TANPA `walletId` → error path `walletId` (pesan `Pilih dompet dulu`).
  - `DebtSchema` dengan `reduceBalance` + `walletId` → success.
  - `DebtPaymentSchema` tolak walletId kosong (`Pilih dompet dulu`), tolak amount ≤ 0, default date.
- [ ] **Step 2: `validation.ts`:**

```ts
export const DebtSchema = z
  .object({
    person: z.string().trim().min(1, 'Nama wajib diisi').max(60, 'Nama terlalu panjang'),
    direction: z.enum(['owe', 'owed'], { message: 'Arah tidak valid' }),
    amount: z.coerce.number().int('Jumlah harus bilangan bulat').positive('Jumlah harus lebih dari 0').max(999_999_999, 'Jumlah terlalu besar'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').default(() => todayISO()),
    walletId: z.string().trim().default(''),
    reduceBalance: z.string().optional() // checkbox sends 'on'
  })
  .refine((d) => d.reduceBalance !== 'on' || d.walletId !== '', {
    message: 'Pilih dompet dulu',
    path: ['walletId']
  });

export const DebtPaymentSchema = z.object({
  debtId: z.string().trim().min(1),
  amount: z.coerce.number().int('Jumlah harus bilangan bulat').positive('Jumlah harus lebih dari 0').max(999_999_999, 'Jumlah terlalu besar'),
  walletId: z.string().trim().min(1, 'Pilih dompet dulu'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').default(() => todayISO())
});
```

  Note: import `todayISO` dari `$lib/format` (sudah ada setelah ux-data-model).
- [ ] **Step 3:** `npm test` hijau. Commit `feat(validation): debt and debt payment schemas`.

### Task 3: Halaman Hutang + nav + kartu Beranda (owner: designer, batch A — setelah Task 1–2)

Berkas: `src/routes/hutang/+page.svelte|+page.server.ts` (baru), `src/lib/components/Navigation.svelte`, `src/routes/+page.svelte|+page.server.ts`. **Larangan:** jangan ubah `db.ts`/`validation.ts`/file milik plan lain (copilot, analytics, transactions).

- [ ] **Step 1: `Navigation.svelte`** — tambah item ke `items`: `{ href: '/hutang', label: 'Hutang', icon: HandCoins }` (import dari `@lucide/svelte`). Bottom nav mobile: `grid-cols-6` → `grid-cols-7`, teks item `text-[11px]` → `text-[10px]`. Sidebar desktop tak perlu perubahan layout (auto).
- [ ] **Step 2: `src/routes/hutang/+page.server.ts`:**

```ts
export const load: ServerLoad = async ({ locals, platform }: RequestEvent) => {
  if (!locals.session) redirect(303, '/login');
  const db = platform!.env.DB;
  const [wallets, debts, totals] = await Promise.all([
    listWallets(db), listDebts(db), getDebtDirectionTotals(db)
  ]);
  return { wallets, debts, totals };
};

export const actions: Actions = {
  create: async ({ request, platform }) => {
    const parsed = DebtSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
    await createDebt(platform!.env.DB, {
      person: parsed.data.person,
      direction: parsed.data.direction,
      amount: parsed.data.amount,
      date: parsed.data.date,
      walletId: parsed.data.walletId || null,
      reduceBalance: parsed.data.reduceBalance === 'on'
    });
    return { success: true };
  },
  pay: async ({ request, platform }) => {
    const parsed = DebtPaymentSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
    const res = await addDebtPayment(platform!.env.DB, {
      debtId: parsed.data.debtId, amount: parsed.data.amount,
      walletId: parsed.data.walletId, date: parsed.data.date
    });
    if (res === 'overpay') return fail(400, { error: 'Nominal melebihi sisa utang' });
    if (res === 'not-found') return fail(400, { error: 'Utang tidak ditemukan' });
    return { success: true };
  },
  delete: async ({ request, platform }) => {
    const id = String((await request.formData()).get('id') ?? '');
    const res = await deleteDebt(platform!.env.DB, id);
    if (res === 'has-payments') return fail(400, { error: 'Tidak bisa dihapus: sudah ada pembayaran' });
    if (res === 'not-found') return fail(400, { error: 'Utang tidak ditemukan' });
    return { success: true };
  }
};
```

- [ ] **Step 3: `src/routes/hutang/+page.svelte`** (pola kartu `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800`; modal pola `TransactionForm.svelte` + `modalAccessibility`):
  - **Header** `Hutang` + tombol `Catat` (buka modal catat). Belum ada utang → empty state `Belum ada catatan hutang.`
  - **3 kartu ringkas**: `Kamu Berutang` (red, sum `totals.owe`), `Dipinjamkan` (emerald, `totals.owed`), `Selisih` (`owed - owe`, negatif merah/positif netral) — pola baris kartu Beranda (`+page.svelte:92-133`).
  - **List** (semua debt, termasuk yang sudah lunas — `remaining > 0` tampil normal, `remaining == 0` tampil dengan badge `Lunas` + opacity rendah): per baris: nama orang, badge `<Utang|Piutang>` (red/sky), tanggal `formatDate(d.date)`, progress bar `width = min(100, paid/amount*100)%` (bg red untuk owe, emerald untuk owed), sisa `formatIDR(remaining)`, badge dompet (pola wallet badge `transactions/+page.svelte:170-177`), tombol `Bayar` (kecuali lunas) + `Hapus` (ConfirmModal, pesan peringatan delete).
  - **Modal Catat Utang**: nama (`name="person"`), toggle arah 2 tombol (`name="direction"` input hidden + state, pola `kindToggle` di wallets — merah `Kamu Berutang` / sky `Dipinjamkan`), nominal (`name="amount"` + preset chips pola TransactionForm `PRESETS`), tanggal `name="date"` default `todayISO()`; checkbox `name="reduceBalance"` `Langsung kurangi saldo dompet ini` → saat dicentang tampilkan select dompet (`name="walletId"` optgroup digital/cash, pola TransactionForm); error `errors.*` tampil per field (pola TransactionForm).
  - **Modal Bayar** (per baris, state `payTarget: DebtRow | null`): nominal (`name="amount"`, default sisa, max sisa), select dompet (`name="walletId"` REQUIRED, optgroup), tanggal `name="date"`, hint `Sisa: {formatIDR(remaining)}`. Submit POST `?/pay` dengan `debtId` hidden.
  - Form delete hidden + ConfirmModal (pola `transactions/+page.svelte:208-221`).
- [ ] **Step 4: `+page.server.ts` + `+page.svelte` (Beranda)** — load tambah `debtTotals = await getDebtDirectionTotals(db)` ke `Promise.all`; render kartu kecil di bawah section ringkasan bulan (pola kartu existing): `Hutang {formatIDR(totals.owe)} · Piutang {formatIDR(totals.owed)}` dalam satu kartu yang seluruhnya `<a href="/hutang">`. Hanya tampil saat ada salah satu > 0 (hindari noise angka nol).
- [ ] **Step 5: `npm run check` + manual `npm run dev`**: catat owe tanpa centang (saldo tak berubah, sisa penuh) → bayar 200rb dari dompet → cek saldo dompet turun 200rb, transaksi `Bayar utang ke X` muncul, sisa berkurang → lunasi → badge Lunas → coba hapus (ditolak) → catat owed dengan centang (saldo naik, transaksi `Pinjamkan ke X`) → lihat kartu Beranda. Commit `feat(ui): debts page with partial payments, navigation, home summary`.

### Task 4: Review + verifikasi akhir (owner: reviewer, batch B — setelah A)

- [ ] Reviewer dispatch: diff branch vs main, fokus money path (addDebtPayment atomicity via db.batch, overpay guard, reduceBalance single-path, delete guard, schema CHECK di SQL vs zod). **Fallback:** dispatch gagal (kredensial) → builder review inline dengan checklist: paid selalu == SUM(debt_payments) (tidak ada jalur lain ubah paid), tiap payment membuat tepat 1 transaksi (owe→expense/owed→income) dengan wallet_id/date sama, overpay dicek sebelum batch, reduceBalance tidak double-count (1 payment utk 1 catat), delete debt dengan payment mustahil, tidak ada transaksi hutang masuk agregat transfer/khusus.
- [ ] `npm test && npm run check && npm run build` hijau.
- [ ] **Jalankan migration remote**: `npx wrangler d1 execute digital-wallet-db --remote --file=migrations/002-debts.sql` (SEBELUM merge ke main).
- [ ] Smoke manual `npm run dev` end-to-end sesuai Task 3 Step 5 + cek prod setelah deploy.

## Acceptance Criteria

1. Bisa catat utang DAN piutang (arah toggle); tiap entri: nama, nominal, tanggal, dompet, opsi "langsung kurangi saldo".
2. Centang "langsung kurangi saldo" → saldo dompet berubah seketika (owe: −, owed: +), transaksi otomatis tercatat, utang langsung berstatus lunas (paid = amount).
3. Tanpa centang → catatan murni, saldo tidak berubah.
4. Bayar cicilan → sisa (`amount - paid`) berkurang; bayar penuh → sisa 0 → badge `Lunas`; overpay ditolak dengan pesan.
5. Setiap pembayaran membuat transaksi otomatis di dompet terpilih (express/income sesuai arah) dengan tanggal pembayaran.
6. Hapus hanya diizinkan saat belum ada pembayaran; ada pembayaran → ditolak dengan pesan jelas.
7. Nilai `paid` utang selalu konsisten dengan jumlah seluruh pembayaran (satu jalur kode).
8. Nav (sidebar + bottom nav) punya "Hutang"; bottom nav mobile 7 kolom tetap usable.
9. Beranda menampilkan ringkasan Hutang/Piutang yang menaut ke `/hutang`, hanya saat ada data.

## Verification / Tests

- `npm test` — unit: db (listDebts mapping + remaining, addDebtPayment overpay guard/atomicity, deleteDebt guard, createDebt reduceBalance), validation (DebtSchema/DebtPaymentSchema).
- `npm run check` — types. `npm run build` — production build.
- Manual E2E Task 4 smoke.
- `npx wrangler d1 execute digital-wallet-db --local --command "SELECT direction, count(*), sum(amount-paid) FROM debts GROUP BY direction"` — sisa per arah.

## Git (branch: feature/debts)

- Branch dari `main` (WAJIB sudah berisi merge `ux-mobile-settings` + `ux-data-model`). Commit per task (conventional, English). Push + merge `--no-ff` setelah Task 4 hijau.
- Migration 002 sudah diterapkan remote SEBELUM merge (lihat Integration Notes).
- Setelah merge: `graphify update .` bila hook tidak menangani.

## Integration Notes

- **Urutan merge:** `feature/ux-mobile-settings` → `feature/ux-data-model` → **`feature/debts`** → `feature/ai-chatbox` (plan `plan/ai-chatbox.md` bergantung pada `listOpenDebts` di db.ts — jangan rename/hapus fungsi ini tanpa koordinasi).
- Zero overlap file dengan `plan/ai-chatbox.md`: debts menyentuh `db.ts`/`validation.ts`/`Navigation.svelte`/halaman baru; ai-chatbox menyentuh `ai.ts`/`copilot/*`/`api/ai/*`. Satu pengecualian: keduanya menyentuh `db.test.ts` — aman karena merge sequential.
- Migration `002-debts.sql` = tabel BARU saja (tidak rebuild) → aman diterapkan remote kapan saja; tetap jalankan sebelum merge agar UI `/hutang` tidak 404 di prod.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 Schema+migration+db | builder | – (sequential) | Money path inti; semua fungsi hutang konsumsi ini; fakeDb perlu `batch` |
| 2 Validasi | builder | – (setelah 1) | Money/security path, butuh bentuk data Task 1 |
| 3 UI hutang+nav+beranda | designer | A | UI-heavy, file terisolasi (halaman baru + nav + beranda) |
| 4 Review | reviewer | B (setelah A) | Read-only gate money path; fallback inline (credential issue) |

Batch A = Task 3 saja (satu task UI). Larangan keras: designer tidak mengubah `db.ts`/`validation.ts` — akses hanya lewat fungsi Task 1–2.