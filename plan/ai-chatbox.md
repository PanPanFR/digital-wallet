# Implementation Plan: AI Chatbox — Copilot jadi Asisten Tanya-Apa-Saja (RAG via snapshot DB)

> **For agentic workers:** REQUIRED: execute task-by-task (subagent-per-task per Delegation Strategy, atau plans skill execute mode). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ubah Copilot dari "parser transaksi + laporan bulanan statis" menjadi **chatbox asisten keuangan** murni: user mengetik pertanyaan bebas ("hari ini pengeluaran berapa?", "ada utang ga?"), server mengumpulkan snapshot terstruktur dari database (dompet+saldo, utang terbuka, transaksi bulan ini/bulan lalu, tren 6 bulan, kategori), menginjeksikannya ke prompt AI sebagai konteks (RAG pola 1: snapshot terstruktur per-request), AI menjawab dari data itu. **Tab Parse Teks dan seluruh jalur parser dihapus** (keputusan user: AI bukan parser lagi).

**Architecture:** SvelteKit (Svelte 5 runes) + Cloudflare Worker + D1. Server-side: satu endpoint chat stateless `POST /api/ai/report` yang menerima `{ question, history }`, fetch konteks DB, panggil LLM, balik teks. Chat state (riwayat) dipegang client dan dikirim ulang tiap request — tidak ada server session chat. `ai.ts` refactor: hapus fungsi parser, perluas `reportAnswer` jadi `chatAnswer(cfg, question, history, contextJson)`.

**Tech Stack:** Sama; tanpa dependency baru. LLM lewat OpenAI-compatible endpoint 9router (default), model `gemini-2.5-flash`, max_tokens naik ke 1024 untuk jawaban chat.

## Global Constraints

- Identifier/komentar kode English; UI copy Indonesian.
- **Assumed base state (WAJIB sudah merge sebelum branch ini):** `feature/ux-mobile-settings`, `feature/ux-data-model`, DAN **`feature/debts`** (plan `plan/debts.md`) sudah di `main`. Yang plan ini pakai dari debts: `listOpenDebts(db)` di `src/lib/server/db.ts` (jangan rename). Yang dari ux-data-model: transaksi punya `date`, `getMonthlySummary`/`getCategoryTotals`/`getMonthlyTotals`/`getWalletBalances` signature baru, `formatDate` di `$lib/format`.
- No server-side chat session. History dikirim client (maks 8 pesan), server hanya menambah konteks DB ke prompt. Stateless = sederhana, tanpa rate-limit tambahan per-session (rate limit `/api/ai/report` existing tetap).
- CSRF origin check tetap di endpoint (pola existing).
- AI TIDAK pernah menulis ke database (read-only question answering). Menulis hanya lewat form/action biasa.
- Jawaban AI: plain text Indonesia, tanpa markdown bullets — system prompt menegaskan.
- `ponytail:` comment untuk shortcut sadar (snapshot = pola 1 RAG; lihat Scope).

## Scope decisions (user approved via brainstorming, 2026-09-08)

1. **Tab Parse Teks DIHAPUS.** `src/routes/copilot/+page.svelte` jadi chatbox murni (singkirkan tab, state parse, preview, `selectedItems`, `create-bulk` form; bobot chat report jadi konten utama). `src/routes/api/ai/parse/+server.ts` dihapus; `src/routes/copilot/+page.server.ts` dihapus **bulk action** (load tetap, kirim wallets untuk konteks UI).
2. **`ai.ts` dibersihkan:** hapus `TransactionSchema`, `buildParsePrompt`, `normalizeItem`, `ParsedTransaction`, `parseTransactions`. Tinggal helper HTTP (`getConfig`, `callChatCompletion`, `extractContent`, `mapStatusToFriendlyError`) + `chatAnswer`.
3. **Context = snapshot terstruktur (RAG pola 1).** Server mengumpulkan per request:
   - `wallets` + `balances` (getWalletBalances — all-time)
   - `summaryThisMonth` + `summaryLastMonth` (getMonthlySummary, date bulan lalu via helper lokal)
   - `categoriesThisMonth` (getCategoryTotals)
   - `trend6` (getMonthlyTotals, 6)
   - `openDebts` (listOpenDebts — remaining per debt, person, direction)
   - `recent` (listTransactions limit 10, tanpa search/category — konteks "baru saja")
   Semua diserialisasi JSON dan diinjeksikan. **Ceiling:** data personal ~satuan KB; 10rb+ transaksi → pertimbangkan tool calling (pola 2). `ponytail:` comment di `chatAnswer` untuk ceiling ini.
4. **History support:** client kirim `history` (array `{role:'user'|'assistant', content}` maks 8, terbaru dibalik jadi urutan kronologis). Server append ke messages sebelum sistem/membangun prompt. Follow-up "terus bulan lalu gimana?" berfungsi karena konteks snapshot tetap dikirim penuh tiap request.
5. **Prompt:** system = asisten keuangan Indonesia; user = WIB now + konteks JSON + transkrip + pertanyaan; instruksi: jawab hanya dari data, jawab "Tidak ada data..." bila kosong, sebut angka pakai format IDR, plain text tanpa bullet/markdown.
6. **UI chatbox**: bubble chat existing (pola `copilot/+page.svelte` saat ini) dijadikan konten tunggal halaman; input + tombol kirim + loading + pesan error dengan "Coba lagi". Hint awal (placeholder) contoh pertanyaan: "Berapa pengeluaran hari ini?", "Ada utang apa saja?", "Pengeluaran terbesar bulan ini?".
7. **Max pertanyaan 500 karakter** (tetap).

**Non-goals (defer, satu baris alasan):** tool calling (upgrade ceiling, lihat Scope 3), server-side chat session/history persist (butuh tabel + cleanup — belum diminta), AI menulis data (prinsip read-only chat), streaming respons (UX nicety, lakukan setelah core jalan), input suara (non-prioritas).

## Dependencies

- Branch ini WAJIB di atas `main` berisi merge `ux-mobile-settings` + `ux-data-model` + **`feature/debts`** (pakai `listOpenDebts`).
- Tidak ada dependency npm baru.
- Cloudflare: user `wrangler login` → builder set/cek secret bila perlu (`GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL` sudah ada di prod; verifikasi saja via `wrangler secret list`).
- Reviewer subagent pernah gagal dispatch (kredensial gmicloud) → fallback review inline.

## Files / Areas Likely Affected

- `src/lib/server/ai.ts` — buang parser, tambah `chatAnswer` (konteks JSON + history + IDR instruction)
- `src/lib/server/ai.test.ts` — hapus test parser; tambah test `chatAnswer`; update test `reportAnswer` (ganti nama/API)
- `src/routes/api/ai/report/+server.ts` — terima `history`, bangun konteks DB lengkap, panggil `chatAnswer`
- `src/routes/api/ai/parse/+server.ts` — **hapus**
- `src/routes/copilot/+page.svelte` — jadi chatbox murni
- `src/routes/copilot/+page.server.ts` — hapus action `create-bulk` + `BulkSchema`; load tetap
- `src/lib/server/db.ts` — **tidak berubah** (pakai fungsi existing + `listOpenDebts` dari debts)
- `src/lib/server/db.test.ts` — tidak berubah (listOpenDebts sudah tertest di plan debts)

## Implementation Steps

### Task 1: Refactor `ai.ts` + tests (owner: builder, inline — inti logika AI)

- [ ] **Step 1: Hapus test parser** di `ai.test.ts`: blok `describe('parseTransactions')` (kedua), `describe('buildParsePrompt')`. Update import.
- [ ] **Step 2: Update `reportAnswer` test** → panggilan baru:
  - `chatAnswer('k', 'berapakah...', [], '{"summary":{}}')` → jawaban dikembalikan dari Gemini response.
  - `chatAnswer('k', 'q', [{role:'user',content:'berapakah'},{role:'assistant',content:'jawab'}], '{"x":1}')` → request body messages memuat: system (mengandung instruksi IDR/plain), semua history, konteks JSON, pertanyaan terakhir. Assert dengan `calls[0].init.body`.
  - 429 → friendly error; 500 → friendly error.
- [ ] **Step 3: Implementasi `chatAnswer` di `ai.ts`:**

```ts
export async function chatAnswer(
  apiKey: string,
  question: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  contextJson: string
): Promise<string> {
  const cfg = getConfig(apiKey); // max_tokens 1024 untuk chat
  const systemPrompt = `Kamu adalah asisten keuangan pribadi untuk pengguna Indonesia. Jawab PERTANYAAN pengguna HANYA berdasarkan data konteks yang diberikan. Jangan mengarang angka. Kalau data tidak ada / tidak relevan, katakan "Tidak ada data..." lalu berhenti. Gunakan format Rupiah (Rp1.250.000). Jawab dalam bahasa Indonesia, plain text tanpa bullet/markdown, ringkas dan terstruktur.`;
  const userPrompt = `Waktu sekarang (WIB): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}

Data keuangan pengguna (JSON):
${contextJson}

${history.length ? `Percakapan sebelumnya:\n${history.map((m) => `${m.role === 'user' ? 'User' : 'Asisten'}: ${m.content}`).join('\n')}\n\n` : ''}Pertanyaan terakhir: "${question}"

Jawab dalam bahasa Indonesia.`;
  const res = await callChatCompletion(cfg,
    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    { max_tokens: 1024 });
  // error handling + extractContent + trim — pola reportAnswer lama
}
```

  `ponytail:` comment di atas fungsi: `// ponytail: snapshot context (RAG pola 1). Sangat muat sampai ~10rb transaksi; upgrade ke tool calling bila data membesar.`
  - Catatan: `callChatCompletion` di `ai.ts` punya default `temperature 0.2` — biarkan (jawaban faktual dari data, konsisten).
- [ ] **Step 4: Hapus** `buildParsePrompt`, `parseTransactions`, `normalizeItem`, `TransactionSchema`, `ParsedTransaction` + import `WalletRow` yang tak terpakai. Pastikan tidak ada referensi tersisa (`grep -rn "parseTransactions\|buildParsePrompt" src/` → kosong).
- [ ] **Step 5:** `npm test` hijau (ai.test.ts + sisanya). Commit `refactor(ai): drop parser, chatAnswer with history and context`.

### Task 2: Endpoint report + hapus parse (owner: builder, inline — setelah Task 1)

- [ ] **Step 1: Rewrite `src/routes/api/ai/report/+server.ts`:**

```ts
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { chatAnswer } from '$lib/server/ai';
import {
  getCategoryTotals, getMonthlySummary, getMonthlyTotals,
  getWalletBalances, listOpenDebts, listTransactions
} from '$lib/server/db';

const ChatSchema = z.object({
  question: z.string().trim().min(1, 'Pertanyaan tidak boleh kosong').max(500),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(8)
    .default([])
});

export const POST: RequestHandler = async ({ request, platform, url }) => {
  // CSRF origin check (pola existing)
  const apiKey = platform!.env.GOOGLE_API_KEY;
  if (!apiKey) return json({ error: 'Fitur AI belum dikonfigurasi' }, { status: 503 });

  const parsed = ChatSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return json({ error: 'Pertanyaan tidak boleh kosong (maks. 500 karakter)' }, { status: 400 });

  const db = platform!.env.DB;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;

  const [wallets, summaryThis, summaryLast, categories, trend6, openDebts, recent] =
    await Promise.all([
      getWalletBalances(db),
      getMonthlySummary(db, thisMonth),
      getMonthlySummary(db, lastMonth),
      getCategoryTotals(db, thisMonth),
      getMonthlyTotals(db, 6),
      listOpenDebts(db),
      listTransactions(db, { limit: 10 })
    ]);

  const contextJson = JSON.stringify({
    thisMonth, lastMonth, wallets, summaryThisMonth: summaryThis,
    summaryLastMonth: summaryLast, categories: categories,
    trend6Months: trend6, openDebts
  });

  try {
    const answer = await chatAnswer(apiKey, parsed.data.question, parsed.data.history, contextJson);
    return json({ answer });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses AI' },
      { status: 502 }
    );
  }
};
```

  Note: `wallets` di sini = `getWalletBalances` (dengan balance) — cukup untuk "saldo saya berapa". `recent` memberi nama dompet via join (wallet_name) — bagus untuk menyebut konteks.
- [ ] **Step 2: Hapus** `src/routes/api/ai/parse/+server.ts`. Grep `api/ai/parse` di seluruh `src/` → kosong.
- [ ] **Step 3: `copilot/+page.server.ts`** — hapus `BulkSchema`, import `createTransactions`, action `create-bulk`. Load tetap `listWallets`.
- [ ] **Step 4:** `npm run check` hijau (types; pastikan tidak ada import mati). Commit `feat(api): chat endpoint with full DB context, drop parse endpoint`.

### Task 3: Chatbox UI (owner: designer, batch A)

Berkas: `src/routes/copilot/+page.svelte` saja.

- [ ] **Step 1: Bersihkan** — hapus tab state (`tab`), seluruh blok parse (Preview type, text, parsing, parseError, previews, selected, saving, doParse, walletName, selectedItems, anySelected, handleSave), tombol tab, dan bagian `{#if tab === 'parse'}`. Halaman = satu kolom chatbox + input.
- [ ] **Step 2: Chat state + history** — `ChatItem { role, content, error? }`; `history` untuk fetch = 8 pesan terakhir (kirim `{role, content}` saja); tiap `ask()` push user → fetch `/api/ai/report` dengan `{ question, history: historyRef.slice(-8) }` → push assistant. Setelah jawaban sukses, `historyRef` di-update (sebagai cache — singkirkan saat chat direset/pindah halaman; SvelteKit re-render tidak masalah, state $state hilang saat navigasi).
- [ ] **Step 3: UI** — render chat bubble (pola existing `+page.svelte:209-236`): user kanan sky, assistant kiri gray; error merah + tombol `Coba lagi` (panggil ulang `ask(lastQuestion)`); loading bubble "Sedang menganalisis...". Input bawah: text + tombol kirim (ikon Send), `maxlength=500`, disabled saat asking/kosong; placeholder: `cth. Berapa pengeluaran hari ini? Ada utang apa saja?`.
- [ ] **Step 4: Empty state** — saat belum ada pesan: card center `Tanya apa saja tentang keuanganmu.` + 3 chip pertanyaan contoh (klik → langsung ask): "Berapa pengeluaran hari ini?", "Ada utang apa saja?", "Pengeluaran terbesar bulan ini?".
- [ ] **Step 5:** `npm run check` + manual `npm run dev`: tanya "berapakah pengeluaran hari ini?" (jawab dari data hari ini), "ada utang ga?" (muncul dari openDebts — perlu data uji: buat 1-2 utang via /hutang dulu), follow-up "terus bulan lalu gimana?" (history bekerja), pertanyaan tak relevan → jawab "Tidak ada data...". Commit `feat(copilot): pure chatbox with example prompts`.

### Task 4: Review + verifikasi akhir (owner: reviewer, batch B — setelah A)

- [ ] Reviewer dispatch: diff branch vs main, fokus: tidak ada sisa parser (grep parse/buildParsePrompt), CSRF origin check utuh, zod skema chat aman (history max 8, content max 2000), konteks DB tidak bocorkan data ekstra (hanya fungsi yang ada), error handling 429/502.
- [ ] **Fallback** (dispatch gagal — kredensial): builder review inline dengan checklist di atas + `npm test && npm run check && npm run build`.
- [ ] Manual smoke `npm run dev` sesuai Task 3 Step 5.
- [ ] Cek prod: `npx wrangler secret list` — `GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL` sudah terpasang.

## Acceptance Criteria

1. Copilot = satu chatbox; tidak ada tab Parse Teks; `/api/ai/parse` tidak ada; tidak ada kode parser tersisa di repo.
2. Pertanyaan tentang hari ini/bulan ini (pengeluaran, pemasukan, kategori, saldo) dijawab dari data DB terkini, bukan tebakan AI.
3. Pertanyaan tentang utang ("ada utang ga", "berapa sisa pinjaman X") dijawab dari `listOpenDebts` (remaining per orang + arah).
4. Follow-up seperti "terus bulan lalu gimana?" berfungsi (history ≤ 8 pesan dikirim).
5. Pertanyaan tidak relevan / tidak ada data → jawaban menyebut "Tidak ada data".
6. Jawaban plain text Indonesia, pakai format Rupiah, tanpa markdown bullets.
7. AI tidak pernah menulis ke database (endpoint read-only).
8. Error 429/502/503 ditampilkan user dengan pesan ramah + tombol coba lagi.

## Verification / Tests

- `npm test` — ai.test.ts: chatAnswer (konteks+history masuk prompt, error mapping), tanpa test parser.
- `npm run check` — types. `npm run build` — production build.
- Manual: Task 3 Step 5 (termasuk utang via /hutang untuk data openDebts).
- `grep -rn "parseTransactions\|buildParsePrompt\|api/ai/parse" src/` — kosong (tidak ada sisa parser).

## Git (branch: feature/ai-chatbox)

- Branch dari `main` (WAJIB sudah berisi merge `ux-mobile-settings` + `ux-data-model` + **`feature/debts`**). Commit per task (conventional, English). Push + merge `--no-ff` setelah Task 4 hijau.
- Tidak ada migration baru (tidak sentuh schema).
- Setelah merge: `graphify update .` bila hook tidak menangani.

## Integration Notes

- **Urutan merge:** `feature/ux-mobile-settings` → `feature/ux-data-model` → `feature/debts` → **`feature/ai-chatbox`**.
- Terikat pada `listOpenDebts` dari plan debts: kalau debts belum merge, fungsi ini belum ada → endpoint compile error. Jangan mulai branch ini sebelum debts merge.
- Menghapus `/api/ai/parse` + tab Parse = **kerja ux-data-model Task 4 (preview copilot editable) dibuang**. Disengaja (keputusan user: AI bukan parser). Tidak ada file ux-data-model yang di-revert — hanya dihapus bagian yang jadi mati.
- Zero overlap file dengan branch debts (debts: db.ts/validation.ts/Navigation/hutang; ini: ai.ts/copilot/api-ai). `db.test.ts` disentuh debts saja; plan ini tidak menyentuh test db.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 Refactor ai.ts | builder | – (sequential) | Inti logika AI + prompt; request shape endpoint Task 2 bergantung ini |
| 2 Endpoint+cleanup | builder | – (setelah 1) | Konsumen `chatAnswer`; hapus parse/action |
| 3 Chatbox UI | designer | A | UI-heavy, file terisolasi (`copilot/+page.svelte`) |
| 4 Review | reviewer | B (setelah A) | Read-only gate; fallback inline (credential issue) |

Batch A = Task 3 saja. Larangan keras: designer tidak mengubah `ai.ts`/`+server.ts`/`db.ts` — hanya `copilot/+page.svelte`.