# Implementation Plan: AI Provider Settings (Custom Providers + Model Switching)

## Objective

Make Copilot configurable from the UI like a ChatGPT-style client: users can add/edit/delete AI providers (base URL, API key, models), pick an active provider, and switch provider + model from the Copilot chat page. Remove the duplicate theme toggle from Settings while touching that page.

## Scope

- New provider storage in existing `app_settings` table (keys `ai_providers` JSON, `ai_active_provider` id). No schema change.
- Settings page: new "AI / Copilot" section (CRUD providers, set active). Remove existing "Tampilan" (ThemeToggle) section — toggle already lives in the menubar (`Navigation.svelte:55`).
- Copilot chat page: provider + model dropdowns in the header; selected values passed to the AI endpoint.
- AI endpoint (`api/ai/report`): resolve config from stored provider; fall back to env (`GOOGLE_API_KEY` / `AI_BASE_URL` / `AI_MODEL`) when no provider is configured. Backward compatible.
- Update `docs/data-model.md` `app_settings` table with the two new keys.

## Context

- Stack: SvelteKit 2 + Svelte 5 (runes), Cloudflare Workers + D1 (binding `DB`), Tailwind 4, zod, vitest. Single-user app behind a master password; all data in one D1 DB.
- SvelteKit 2 gotcha (from project memory): use `ServerLoad` (imported from `@sveltejs/kit`) + `RequestEvent` for action/load param types — `PageServerLoad` does not exist.
- `src/lib/server/ai.ts`: `getConfig(apiKey)` reads `AI_BASE_URL`/`AI_MODEL` env with defaults `https://9router.panpan.my.id/v1` + `gemini-2.5-flash`. `chatAnswer(apiKey, question, history, contextJson)` calls OpenAI-compatible `/chat/completions`, parses OpenAI and Gemini response shapes.
- `src/routes/api/ai/report/+server.ts`: CSRF origin check → requires `platform.env.GOOGLE_API_KEY` (503 "Fitur AI belum dikonfigurasi" if missing) → builds context JSON snapshot → `chatAnswer`.
- `src/routes/copilot/+page.svelte`: chat UI; POSTs `{ question, history }` to `/api/ai/report`.
- `src/routes/settings/+page.server.ts`: only `change-password` action; `load` returns `{}`. `getSetting`/`setSetting` upsert helpers exist (`db.ts:353-372`).
- API keys stored plaintext in D1: accepted tradeoff for a single-user app behind master password. Add a code comment noting the tradeoff; do not echo the key back in edit mode (masked input, keep stored value on empty).
- Session guard pattern: every page `load` redirects to `/login` if `!locals.session`.

## Dependencies

None. Branches from current `main` (5ac576b).

## Files / Areas Likely Affected

- `src/lib/server/aiProviders.ts` (NEW): provider storage helpers + validation schema.
- `src/lib/server/ai.ts`: refactor `chatAnswer` to take an explicit `AiConfig`; keep env fallback config.
- `src/routes/api/ai/report/+server.ts`: resolve provider config (body override → active provider → env), pass config to `chatAnswer`.
- `src/routes/settings/+page.server.ts`: `load` returns providers + active; actions `save-provider`, `delete-provider`, `set-active`.
- `src/routes/settings/+page.svelte`: AI section UI; delete Tampilan section + ThemeToggle import.
- `src/routes/copilot/+page.server.ts`: `load` returns providers (id, name, models) for dropdowns.
- `src/routes/copilot/+page.svelte`: provider + model selects in header; include `providerId`/`model` in POST body.
- `src/lib/server/ai.test.ts`: update for new `chatAnswer` signature; add `aiProviders` round-trip tests.
- `docs/data-model.md`: add `ai_providers`, `ai_active_provider` rows to `app_settings` table.

## Implementation Steps

1. **`src/lib/server/aiProviders.ts`** — types `AiProvider = { id, name, baseUrl, apiKey, model, models: string[] }`; `ProviderSchema` (zod: name 1–50, baseUrl `z.string().url()`, apiKey min 1, models parsed from comma-separated string into `string[]`); `getProviders(db)`, `saveProviders(db, providers)`, `getActiveProviderId(db)`, `setActiveProviderId(db, id)` — all via `getSetting`/`setSetting`, JSON-encoded, default `[]`/`''` on missing key. `resolveProviderConfig(db, overrideId?)` returns `{ provider, config } | null` where `config = { baseUrl, apiKey, model }`; validates stored JSON defensively (try/catch → treat as empty).
2. **`src/lib/server/ai.ts`** — export `AiConfig`; change `chatAnswer(cfg: AiConfig, question, history, contextJson)`; keep `getConfigFromEnv()` (reads env, default base/model) used as fallback. `extractContent`/`mapStatusToFriendlyError` unchanged.
3. **`src/routes/api/ai/report/+server.ts`** — ChatSchema body extended: `providerId` (string, optional), `model` (string, optional). Config resolution: body `providerId` → that provider (fallback active → env). If body `model` given and inside that provider's `models`, use it. API key must exist else 503 as today. Pass `cfg` into `chatAnswer`.
4. **`src/routes/settings/+page.server.ts`** — `load`: `{ providers, activeProviderId }`. Actions:
   - `save-provider`: parse ProviderSchema (models from `modelsText` comma field); if editing (hidden `id`), replace by `id`; if new, `crypto.randomUUID().replace(/-/g,'')`; if first provider, auto-set active. API key blank on edit = keep existing stored value. Return `{ success: true }`.
   - `delete-provider`: remove by id; if it was active, clear active (leave unset → env fallback).
   - `set-active`: validate id exists, set active.
   - Validation failures → `fail(400, { errors })` following the existing `fieldErrors` pattern.
5. **`src/routes/settings/+page.svelte`** — remove `Tampilan` section (lines ~87–93) + ThemeToggle import. Add "AI / Copilot" section: list providers (name, baseUrl, active radio); per-row edit/delete; add/edit form (name, base URL, API key — type password, models textarea comma-separated); `use:enhance` handlers mirroring existing `handleCreate` patterns; `notify` success/failure.
6. **`src/routes/copilot/+page.server.ts`** — `load` returns `providers: { id, name, models }[]` (strip apiKey — never ship secrets to client).
7. **`src/routes/copilot/+page.svelte`** — header row under the title: provider `<select>` (options from `data.providers`) and model `<select>` (from selected provider's `models`). Default selections from active provider + its `model`. Pass `providerId`/`model` in the POST body. Disable selects while `asking`.
8. **Tests** — update `ai.test.ts` (new `chatAnswer(cfg, …)` signature; add case asserting cfg baseUrl/model appear in the fetch payload). New tests for `aiProviders.ts`: get/save round-trip via mocked D1, corrupt JSON → `[]`, `resolveProviderConfig` override precedence. `report` endpoint is thin — covered implicitly via ai.ts tests.
9. **`docs/data-model.md`** — add the two keys to the `app_settings` known-keys table with one-line descriptions.

## Acceptance Criteria

- Settings page shows AI section with provider list + add/edit/delete/active controls; Tampilan section gone.
- Adding a provider persists across reload; first provider auto-activates.
- Copilot page shows provider + model dropdowns populated from stored providers; switching them changes the request (verified by unit test asserting body model/baseUrl).
- With no provider configured, Copilot still works off env (`GOOGLE_API_KEY`/`AI_BASE_URL`/`AI_MODEL`) — 503 only when neither exists.
- No API key leaks to the client (`copilot` load returns models only, no apiKey).
- `npm test`, `npm run check`, `npm run build` all green.

## Verification / Tests

- `npm test` (vitest) — ai.ts + aiProviders.ts suites.
- `npm run check` — svelte-check 0 errors.
- `npm run build` — production build ok.
- Manual smoke (requires dev login): add provider (e.g. 9router), set active, ask Copilot question; verify model dropdown switches and answer returns.

## Git

- Branch: `feature/ai-provider-settings`
- Commit style: conventional (repo uses `feat(api)`, `fix(api)`, `refactor(ai)` etc.). Suggested: `feat(ai): custom providers + model switcher`, `feat(settings): AI provider management UI`, `chore(docs): app_settings keys`.

## Integration Notes

- Merge after `feature/wallet-fixes`, `feature/bulk-select`, `feature/ui-cleanups` or in any order — no file overlap with them (settings page touched only here; `+page.svelte`/`hutang`/`transactions`/`wallets` untouched by this plan).
- Conflicts expected: none with sibling plans. If `docs/data-model.md` was touched elsewhere, resolve by keeping both additions.

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1 (aiProviders.ts module) | builder | A | Core logic, needs builder's DB/validation context |
| 2 (ai.ts refactor) | builder | A | Same module family as step 1, must stay coherent |
| 3 (report endpoint) | builder | B | Depends on steps 1–2 signatures |
| 4 (settings server actions) | builder | B | Depends on step 1 helpers |
| 5 (settings UI) | designer | C | UI-only; form field names fixed by step 4 contract |
| 6 (copilot server load) | builder | C | Independent of UI, small |
| 7 (copilot UI) | designer | D | Depends on step 6 data shape |
| 8 (tests) | tester | D | Parallel to UI; spec from steps 1–4 |
| 9 (docs) | builder | inline | One-table edit, trivial |

Batch C = steps 5,6 in one message; Batch D = steps 7,8 in one message. Dependencies: A → B → C/D. Step 9 anytime after step 1. Reviewer optional: security check (apiKey never in client load, masked in edit form) can be spot-checked inline by builder.
