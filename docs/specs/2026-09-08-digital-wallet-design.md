# Design: Digital Wallet — Transformasi dari Finance Tracker

Date: 2026-09-08
Status: Diterapkan
Repo baru: https://github.com/PanPanFR/digital-wallet.git

## Goals

1. Ubah konsep: dari "pencatat income/expense" jadi **dompet** — duit tracked per wallet.
2. Dua jenis duit, dipisah di mana-mana: **digital** (GoPay, OVO, DANA, ShopeePay, dll) dan **cash/fisik**.
3. Dashboard: **total gabungan** semua wallet + subtotal digital vs cash + saldo per wallet.
4. Pengeluaran (dan pemasukan) terikat wallet → otomatis ketagih digital/fisik.
5. Rebrand penuh: `finance-tracker-v2` → `digital-wallet` (kode, worker, repo GitHub, folder lokal).
6. Deploy via GitHub (Cloudflare Workers Builds), bukan `wrangler deploy` manual.

## Non-Goals

- Transfer antar wallet (user: tidak perlu sekarang).
- Multi-currency (IDR saja, sama seperti sekarang).
- Saldo disimpan manual / kolom balance (dihitung dari transaksi).
- Multi-user (tetap single-user master password).
- OCR (sudah dropped sebelumnya).

## Keputusan Desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Saldo wallet | **Computed**: `SUM(income) − SUM(expense)` per wallet | Tidak bisa desinkron dengan daftar transaksi; kolom balance manual = sumber bug |
| Data lama | **Mulai bersih** | User: belum ada data berarti; D1 baru, tanpa migrasi |
| D1 | Database baru `digital-wallet-db` | Bersih; D1 lama `finance-tracker-db` ditinggal (hapus manual nanti) |
| Wallet awal | **Seed 2 default** via schema: "Tunai" (cash) + "Dompet Digital" (digital) | App langsung bisa dipakai; user tetap bisa CRUD |
| Jenis wallet | Enum CHECK `('digital','cash')` | Dua jenis saja sesuai kebutuhan; DB constraint > validasi app |
| Deploy | **Cloudflare Workers Builds** (connect repo GitHub di dashboard CF) | Auto-deploy tiap push; user minta "dari github aja" |
| Stack | Vite + React 19 + Hono + Cloudflare Worker + Tailwind v4 + zod + vitest | Stack aplikasi saat ini |

## Data Model (schema.sql baru)

```sql
CREATE TABLE wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('digital','cash')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT DEFAULT 'Lainnya',
  type TEXT DEFAULT 'expense' CHECK (type IN ('income','expense')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
-- index sama seperti lama + idx transactions wallet_id

CREATE TABLE app_settings (...);   -- tetap
CREATE TABLE rate_limits (...);    -- tetap

-- seed
INSERT INTO wallets (id, name, kind) VALUES
  ('seed-cash',    'Tunai',           'cash'),
  ('seed-digital', 'Dompet Digital',  'digital');
```

Layar saldo (semua computed, satu query JOIN):

- Saldo wallet = `SUM(CASE type WHEN income THEN amount ELSE -amount END)` per wallet
- Subtotal digital / cash = sama, `GROUP BY wallets.kind`
- Total gabungan = SUM semua

## UI / Routing

| Area | Perubahan |
|---|---|
| Dashboard (`/`) | Hero **total gabungan**; 2 kartu subtotal Digital vs Cash; daftar saldo per wallet; transaksi terakhir + badge wallet |
| `/wallets` (baru) | CRUD wallet: nama + jenis; preset cepat GoPay/OVO/DANA/ShopeePay/Tunai saat tambah |
| `/transactions` | Form + kolom wallet (select, wajib); filter per wallet dan per jenis |
| `/analytics` | Tetap (agregat income/expense masih valid); breakdown per wallet = nanti |
| `/copilot` + `api/ai/*` | Prompt + schema AI kini menyertakan daftar wallet; hasil parse wajib pilih wallet |
| `/login`, `/settings` | Hanya rebrand string |
| Navigation | Item "Wallets" baru; judul app "Digital Wallet" |

## Rebrand Checklist

- `package.json` name → `digital-wallet`
- `wrangler.jsonc`: `name` → `digital-wallet`, D1 → `digital-wallet-db` (id baru). Build command tidak perlu di config — Workers Builds diset di dashboard CF
- `README.md` judul + deskripsi
- String UI "Finance Tracker" → "Digital Wallet" (layout, login, `app.html`, manifest.json, PWA name)
- Cookie `ft_session` → `dw_session` (auth.ts)
- Git: `git remote set-url origin https://github.com/PanPanFR/digital-wallet.git`, push `main`
- Folder lokal: `finance-tracker-v2` → `digital-wallet` (rename terakhir, setelah semua kerjaan selesai — path session/graphify ikut berubah)

## Deploy via GitHub (satu kali setup)

1. `wrangler d1 create digital-wallet-db` (lokal sekali) → tempel `database_id` baru ke `wrangler.jsonc`
2. `wrangler d1 execute digital-wallet-db --file=schema.sql` (sekali; schema idempoten)
3. Dashboard CF → Workers → Create → **Workers Builds**: connect repo `PanPanFR/digital-wallet`, build command `npm run build`, compatibility date sesuai config
4. Secrets di dashboard worker: `SESSION_SECRET`, `GOOGLE_API_KEY` (sama seperti sekarang)
5. `npm run deploy` tetap ada sebagai fallback manual; CI = primary

## Testing

- `db.test.ts` baru: CRUD wallet, saldo computed (termasuk wallet kosong = 0, multi-wallet, subtotal per kind, total gabungan)
- `validation.ts`: wallet_id wajib + harus wallet existing
- `auth.test.ts` tetap (cookie rename → update assertion)
- AI parse: test wallet list ikut ke prompt (mock, pola ai.test.ts sekarang)
- Manual: seed muncul, CRUD wallet, transaksi nempel wallet, dashboard angka benar

## Risiko / Catatan

- Hapus D1 lama = destruktif → tidak dilakukan di plan; user putuskan sendiri nanti.
- Rename folder lokal di tengah session = path kerja agent jadi basi → urutan plan: semua kerja kode selesai & ter-push dulu, rename folder langkah paling akhir (user eksekusi manual di Explorer/terminal luar).
- Workers Builds butuh repo publik/ter-auth via GitHub App di CF — langkah manual user (saya tidak bisa klik dashboard).
