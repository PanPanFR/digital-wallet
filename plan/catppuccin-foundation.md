# Implementation Plan: Catppuccin Foundation (Tokens + Shell)

## Objective

Ganti total sistem warna slate/oranye ke Catppuccin resmi: Latte untuk light mode, Mocha untuk dark mode. Cakup token terpusat + shell aplikasi (halaman HTML, layout, navigasi, primitif UI, chart theme). Nol perubahan visual di halaman-halaman isi — itu milik plan `ui-deslop-pages`. Selesai plan ini, toggle tema tetap jalan, `npm run check && npm run test` hijau.

## Scope

In:
- Token Catppuccin penuh di `src/app.css` via Tailwind v4 `@theme` (light = Latte) + override `html.dark` (Mocha).
- `src/app.html`: body bg/text ke token, `theme-color` ikut mode.
- `src/lib/components/ThemeToggle.svelte`: logika tetap, meta theme-color ikut mode.
- `src/routes/+layout.svelte`: tidak ada perubahan logika, hanya kelas warna bila masih slate.
- `src/lib/components/Navigation.svelte` (sidebar desktop + bottom nav + sheet "Lainnya"): full token Catppuccin.
- Primitif di `src/app.css` `@layer components`: `.card .btn* .input .chip .label .page-* .section-* .list .list-row .tile`, `:focus-visible`, `::selection`.
- Chart theme `.lc-root-container` (light + dark) ke Catppuccin.
- Primitif overlay: `ModalShell.svelte`, `Toast.svelte`, `ConfirmModal.svelte`, `Skeleton.svelte`.

Out (milik plan `ui-deslop-pages`): semua isi `src/routes/*` (dashboard, transaksi, dompet, analitik, hutang, copilot, settings, login), `TransactionForm`, `WalletSelect`, angka tabular, duplikasi kartu, tooltip chart.

## Context

- Stack: SvelteKit 2 + Svelte 5 runes, Tailwind 4 (CSS-first, tanpa config file, via `@tailwindcss/vite`), class-based dark mode (`@custom-variant dark`, `localStorage ft-theme`, default dark), LayerChart tanpa theme CSS eksternal, Lucide `@lucide/svelte`, font `Plus Jakarta Sans Variable` (tetap — sudah berkarakter, bukan Inter).
- Konvensi repo: tidak ada gradien (solid fill saja), light = border + shadow lembut, dark = hairline ring, safe-area mobile, gerak 150ms + hormat `prefers-reduced-motion`, komponen utilitas di `app.css`.
- Keputusan user: full migrasi Catppuccin, tinggalkan slate/oranye. Light = Latte, dark = Mocha, toggle tetap. Aksen primer = Peach (slot oranye resmi Catppuccin, bukan oranye Tailwind). Semantik uang: Green pemasukan, Red/Maroon pengeluaran, Yellow warning, Blue info. Tidak ada paket baru — hex mentah saja.
- Aturan non-negosiable yang relevan: tidak ada perubahan SQL/skema (plan murni visual), verifikasi = `npm run check && npm run test`.

### Palette resmi (sumber: catppuccin.com/palette)

Mocha (dark):
Rosewater #f5e0dc, Flamingo #f2cdcd, Pink #f5c2e7, Mauve #cba6f7, Red #f38ba8, Maroon #eba0ac, Peach #fab387, Yellow #f9e2af, Green #a6e3a1, Teal #94e2d5, Sky #89dceb, Sapphire #74c7ec, Blue #89b4fa, Lavender #b4befe, Text #cdd6f4, Subtext1 #bac2de, Subtext0 #a6adc8, Overlay2 #9399b2, Overlay1 #7f849c, Overlay0 #6c7086, Surface2 #585b70, Surface1 #45475a, Surface0 #313244, Base #1e1e2e, Mantle #181825, Crust #11111b.

Latte (light):
Rosewater #dc8a78, Flamingo #dd7878, Pink #ea76cb, Mauve #8839ef, Red #d20f39, Maroon #e64553, Peach #fe640b, Yellow #df8e1d, Green #40a02b, Teal #179299, Sky #04a5e5, Sapphire #209fb5, Blue #1e66f5, Lavender #7287fd, Text #4c4f69, Subtext1 #5c5f77, Subtext0 #6c6f85, Overlay2 #7c7f93, Overlay1 #8c8fa1, Overlay0 #9ca0b0, Surface2 #acb0be, Surface1 #bcc0cc, Surface0 #ccd0da, Base #eff1f5, Mantle #e6e9ef, Crust #dce0e8.

### Pemetaan peran (berlaku dua mode, nilai ikut tabel di atas)

- Page bg: dark Crust, light Base. Kartu: dark Base, light Mantle. Sidebar/nav: dark Mantle, light Mantle. Inset/input: dark Surface0, light Base. Border on dark: Surface0/Surface1 tanpa shadow (hairline ring); on light: Surface0 + shadow lembut.
- Teks: Text primer, Subtext1 sekunder, Subtext0 tersier/disabled. Jangan pakai Overlay untuk teks (kontras gagal).
- Aksen primer Peach: tombol primer (teks Crust di atas Peach pada dark; putih di atas Peach Latte pada light — verifikasi kontras), nav aktif (bg Surface0 + teks Peach), logo tile (bg Peach + ikon Crust), focus ring Peach, selection Peach.
- Danger: tombol danger Red Latte `#d20f39` + teks putih; dark `#f38ba8` + teks Crust. Hover danger: Maroon.
- Chart `.lc-root-container`: primary Peach, income Green, expense Red, netral Surface2, surface Text/Base per mode.

## Dependencies

- Tidak ada dependensi kode. Harus merge SEBELUM `ui-deslop-pages` (plan itu memakai token ini).
- Tanpa migrasi DB, tanpa secret, tanpa paket npm baru.

## Files / Areas Likely Affected

- `src/app.css` (pemilik tunggal plan ini: blok `@theme`, `@layer base`, `@layer components`, `.lc-root-container`).
- `src/app.html` (body classes, theme-color, skrip init tetap).
- `src/routes/+layout.svelte` (hanya bila masih ada kelas slate).
- `src/lib/components/Navigation.svelte`, `ThemeToggle.svelte`, `ModalShell.svelte`, `Toast.svelte`, `ConfirmModal.svelte`, `Skeleton.svelte`.
- DILARANG sentuh: `src/routes/*` isi halaman, `src/lib/server/*`, `schema.sql`, `migrations/`.

## Implementation Steps

1. Definisikan `@theme` Catppuccin di `app.css`: nama token `--color-ctp-*` untuk tiap slot (base, mantle, crust, surface0-2, overlay0-2, text, subtext0-1, + 14 aksen), nilai Latte sebagai default, override `html.dark` dengan nilai Mocha. Hapus ketergantungan slate/oranye dari base layer (focus ring, selection).
2. Tulis ulang `@layer components` (.card .btn* .input .chip .label .page-* .section-* .list .list-row .tile) ke token ctp; pertahankan geometri/radius/spacing persis (hanya warna berubah).
3. Remap `.lc-root-container` light+dark ke Peach/Green/Red/Surface Catppuccin.
4. Update `app.html` (body `bg-ctp-crust text-ctp-text dark:...` → token per mode; theme-color dinamis via skrip kecil atau dua meta + JS toggle), `ThemeToggle`, `Navigation` (sidebar, bottom nav, sheet), `ModalShell/Toast/ConfirmModal/Skeleton` ke token.
5. Sapu sisa `slate-* orange-*` di file milik plan ini (grep); yang ada di file milik plan pages JANGAN disentuh, catat lokasinya untuk plan berikutnya.
6. Verifikasi: `npm run check && npm run test`, jalan `npm run dev`, cek tiap shell state (sidebar, bottom nav, sheet, modal, toast, toggle) di light + dark; spot-check kontras pasangan (Peach/Crust dark, Peach/putih light, Text/Base dua mode).

## Acceptance Criteria

- Tidak ada `slate-`/`orange-` tersisa di `app.css`, `app.html`, `Navigation`, `ThemeToggle`, `ModalShell`, `Toast`, `ConfirmModal`, `Skeleton`.
- Toggle terang/gelap bekerja, default tetap dark, tanpa flash tema saat reload.
- Semua halaman tetap render (isi halaman boleh terlihat "campuran" — diperbaiki plan berikutnya, bukan cacat plan ini).
- `npm run check && npm run test` hijau.

## Verification / Tests

- `npm run check && npm run test` (wajib hijau).
- Manual: dev server, alihkan tema, buka tiap route, pastikan shell + overlay konsisten dua mode.
- `npm run preview` sebelum merge (perubahan `app.html` sensitif runtime).
- Tidak ada test unit baru (plan visual; tidak ada perubahan SQL jadi fake-Db tidak tersentuh).

## Git

Branch: `feature/catppuccin-foundation`. Commit plan ini sudah di `main`; branch dibuat dari `main` terbaru saat eksekusi.

## Integration Notes

- Merge PERTAMA, sebelum `feature/ui-deslop-pages`. Urutan: foundation → pages.
- Overlap file dengan plan pages: `src/app.css` (plan ini pemilik penuh; plan pages dilarang edit app.css kecuali kelas `.num` tabular — bila konflik, versi pages rebase di atas foundation).
- Tidak ada sibling plan lain. Setelah dua-duanya hijau, `/integrate` di `main`, hapus file plan.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1-3 (token @theme + components + chart vars di app.css) | builder | - | Inline: satu file, butuh konteks penuh, fondasi semua langkah lain |
| 4a (app.html + ThemeToggle + layout) | designer | A | Shell HTML, state terbatas, tidak berbagi file dengan 4b |
| 4b (Navigation + ModalShell + Toast + ConfirmModal + Skeleton) | designer | A | Komponen overlay/nav, file disjoint dengan 4a |
| 5 (sapu slate/orange + catat sisa untuk plan pages) | reviewer | B | Read-only recon + grep, jalan setelah 4a/4b selesai |
| 6 (check + test + dev walkthrough dua mode) | builder | - | Inline: verifikasi butuh konteks penuh |

Batch A = dua designer call dalam satu message. Batch B setelah A hijau. Rationale inline di atas; tidak ada mutasi lintas-owner dalam satu batch.
