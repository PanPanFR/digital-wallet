# Implementation Plan: UI De-slop Pages (Catppuccin Content Sweep)

## Objective

Rapikan seluruh isi halaman ke Catppuccin + hilangkan pola AI-slop yang ditemukan saat audit live 2026-09-13: aksen oranye dipakai di mana-mana, semua kartu gaya identik, angka tidak tabular, status hanya warna (gagal aksesibilitas), duplikasi blok (Saldo Bersih = Total Saldo; legenda Analitik ganda), tooltip chart tidak terbaca. Struktur IA/APLIKASI dipertahankan (bottom nav, sidebar, ModalShell, form actions + invalidateAll) — yang diganti bahasa visualnya, bukan arsitekturnya.

## Scope

In (semua di bawah memakai token `--color-ctp-*` dari plan `catppuccin-foundation`, JANGAN hardcode hex di class):
- Beranda (`src/routes/+page.svelte`): hero saldo jadi SATU blok fokal (bg Peach solid + teks Crust; dark Peach Mocha `#fab387`, light Peach Latte `#fe640b` + teks putih), kartu Digital/Tunai flat Surface tanpa border abu, HAPUS kartu "Saldo Bersih" duplikat, angka tabular + tanda eksplisit, legend chart redundan (titik warna + label).
- Transaksi: filter form + chip wallet + bulk checkbox + row (tanda −/+ , ikon arah, kategori + dompet) ke token; selection state Peach.
- Dompet: quick-pick buttons + kartu dompet + tombol Atur/Edit/Hapus (danger Red) ke token; tile ikon netral Surface (warna = makna saja, bukan dekorasi).
- Analitik: gabung blok legenda ganda "Makanan 100%" jadi satu; chart memakai theme `.lc-root-container` (sudah Catppuccin dari foundation — di sini hanya rapikan legend/label/tooltip surface).
- Hutang: ringkasan 3 angka + empty state ke token; status lunas/belum dengan ikon + teks, bukan warna saja.
- Copilot (`copilot/+page.svelte`): bubble chat (user Peach, AI Surface), input + tombol kirim, loading/empty/error states.
- Settings: form password, provider AI, backup/restore, sesi — ke token; warning API key Yellow + ikon.
- Login (`login/+page.svelte`): bg Crust/Base, kartu Mantle/Base, tombol Peach, error state Red + teks.
- `TransactionForm.svelte`, `WalletSelect.svelte`: input, select, quick amounts, tombol submit/danger.
- Kelas utilitas baru `.num` di `src/app.css`: `font-variant-numeric: tabular-nums` untuk semua nominal (SATU-SATUNYA edit app.css yang diizinkan plan ini).
- `+error.svelte` bila masih slate/oranye.

Out: token/shell/primitif (milik foundation), logika server, SQL, validasi zod, auth guard, AI provider precedence — dilarang sentuh. Tanpa migrasi DB, tanpa paket baru, tanpa ganti font.

## Context

- Stack/konvensi sama dengan foundation: SvelteKit 2 + Svelte 5, Tailwind 4 CSS-first, dark class-based, no-gradient, safe-area, reduced-motion, form actions + `invalidateAll()`, LayerChart via CSS vars.
- Desain yang dipertahankan (bukan slop, hasil audit): satu angka dominan per layar, aksi Catat primer, bottom-nav 5 item + sheet Lainnya, ModalShell center/sheet, filter bulan + dompet + kategori + cari.
- Anti-slop rules yang dipegang (dari riset): ≤3 hue aktif per layar (Peach dominan + netral + 1 semantik), kartu borderless (ruang → bg shift → elevasi, border hanya bila gagal), tipografi tetap Plus Jakarta Sans (bukan Inter), gerak 150–300ms yang sudah ada, status selalu warna + tanda + ikon.
- Pemetaan peran yang dipakai (nilai eksak ada di plan `catppuccin-foundation`):
  - Dark (Mocha): page Crust #11111b, kartu Base #1e1e2e, nav Mantle #181825, inset Surface0 #313244, teks Text #cdd6f4 / Subtext1 #bac2de / Subtext0 #a6adc8, aksen Peach #fab387, income Green #a6e3a1, expense Red #f38ba8, warn Yellow #f9e2af, info Blue #89b4fa.
  - Light (Latte): page Base #eff1f5, kartu Mantle #e6e9ef, nav Mantle #e6e9ef, inset Base #eff1f5, teks Text #4c4f69 / Subtext1 #5c5f77 / Subtext0 #6c6f85, aksen Peach #fe640b, income Green #40a02b, expense Red #d20f39, warn Yellow #df8e1d, info Blue #1e66f5.
- Temuan audit per halaman (sumber snapshot live 2026-09-13, password-tested): duplikat Saldo Bersih di Beranda; tooltip chart putih tidak terbaca; legenda Analitik ganda; selisih Hutang tanpa konteks; form Settings panjang tanpa grouping visual.

## Dependencies

- TERGANTUNG pada `feature/catppuccin-foundation` yang sudah merge ke `main` (token `--color-ctp-*` harus ada). Jangan mulai sebelum itu.
- Tanpa dependensi DB/paket/secret.

## Files / Areas Likely Affected

- `src/routes/+page.svelte`, `transactions/+page.svelte`, `wallets/+page.svelte`, `analytics/+page.svelte`, `hutang/+page.svelte`, `copilot/+page.svelte`, `settings/+page.svelte`, `login/+page.svelte`, `+error.svelte`.
- `src/lib/components/TransactionForm.svelte`, `WalletSelect.svelte`.
- `src/app.css` — HANYA tambah kelas `.num` tabular; selain itu dilarang.
- DILARANG: `src/lib/server/*`, `schema.sql`, `migrations/`, file shell milik foundation.

## Implementation Steps

1. Beranda: hero Peach solid + teks Crust/putih, kartu sekunder flat, hapus duplikat Saldo Bersih, angka `.num` + tanda, legend redundan, tooltip terbaca.
2. Transaksi + Dompet: filter/chip/checkbox/row dan quick-pick/kartu/aksi ke token; danger Red; tile netral.
3. Analitik + Hutang: gabung legenda ganda, rapikan label/tooltip, ringkasan + empty state + status ikon+teks.
4. Copilot + Settings + Login + error: bubble/form/warning/session ke token; error Red + teks.
5. TransactionForm + WalletSelect + kelas `.num` di app.css; sapu `slate-*/orange-*` di semua file milik plan (grep harus nol).
6. Verifikasi: `npm run check && npm run test`, walkthrough 9 route × 2 mode (dev), screenshot perbandingan, spot-check kontras pasangan kunci.

## Acceptance Criteria

- Nol `slate-`/`orange-`/hex-hardcode di semua file milik plan; semua warna via `ctp-*` atau `.card/.btn/.input` dari foundation.
- Tiap layar: ≤3 hue aktif, satu angka fokal tabular, status selalu warna+tanda+ikon, tanpa blok duplikat, tooltip terbaca dua mode.
- Light (Latte) dan dark (Mocha) keduanya layak screenshot — tidak ada teks tenggelam, tidak ada putih menyala.
- `npm run check && npm run test` hijau; tidak ada perubahan `src/lib/server`, skema, atau perilaku form.

## Verification / Tests

- `npm run check && npm run test` (wajib hijau).
- Manual di `npm run dev`: 9 route (/, /transactions, /wallets, /analytics, /hutang, /copilot, /settings, /login, error) × light/dark; uji keyboard-focus terlihat (ring Peach), reduced-motion tetap hormat, bottom-nav + sheet + modal di mobile.
- `npm run preview` sebelum merge (runtime-sensitive: tidak ada, tapi murah dan konsisten dengan konvensi repo).
- Tanpa test unit baru (visual; SQL tak tersentuh).

## Git

Branch: `feature/ui-deslop-pages`, dari `main` yang SUDAH berisi merge foundation.

## Integration Notes

- Merge KEDUA, setelah `feature/catppuccin-foundation`. Urutan: foundation → pages → `/integrate`, hapus file plan.
- Overlap: `src/app.css` hanya kelas `.num` (foundation pemilik file; rebase pages di atas foundation bila konflik — beda hunk, gabung dua-duanya).
- Tidak ada migrasi; rollback = revert dua commit merge.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 (Beranda + hero + chart legend/tooltip) | designer | A | Satu route, visual paling kompleks, file disjoint dengan batch-A lain |
| 2 (Transaksi + Dompet + form/komponennya) | designer | A | Route berbeda, tidak berbagi file dengan step 1 |
| 3 (Analitik + Hutang) | designer | A | Route berbeda, tidak berbagi file dengan step 1-2 |
| 4 (Copilot + Settings + Login + error) | designer | B | Batch kedua agar diff per-batch tetap reviewable; file disjoint antar-route |
| 5 (.num + sapu slate/orange + TransactionForm/WalletSelect) | builder | - | Inline: edit lintas-file kecil + grep, butuh konteks penuh |
| 6 partial (audit kontras + anti-slop checklist per route) | reviewer | C | Read-only, jalan paralel dengan batch B setelah A hijau |
| 6 final (check + test + walkthrough 9 route × 2 mode) | builder | - | Inline: verifikasi butuh konteks penuh |

Batch A = tiga designer call satu message (file disjoint, aman paralel). Batch B setelah A. Batch C (reviewer) paralel dengan B. Rationale: tidak ada dua owner mutasi file sama dalam satu batch.
