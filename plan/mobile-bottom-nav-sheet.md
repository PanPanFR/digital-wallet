# Implementation Plan: Mobile Bottom Navigation Overhaul

> **For agentic workers:** execute task-by-task, top to bottom, checking off each step. Verify after every task before moving on.

**Goal:** Replace the cramped 7-slot mobile bottom bar with an ergonomic 5-slot bar — 4 primary destinations plus a "Lainnya" bottom sheet holding the rest.

**Architecture:** `Navigation.svelte` tags each nav item `primary`/`secondary`, renders the 4 primary items in a `grid-cols-5` mobile bar plus a "Lainnya" trigger, and opens the 3 secondary items inside a bottom sheet. The sheet reuses the existing modal machinery instead of new code: `ModalShell` gains a `variant="sheet"` (bottom-anchored `fly` transition) while keeping `modalAccessibility` (Escape, focus trap, focus restore). The desktop sidebar keeps all 7 links unchanged.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes · Tailwind 4 (no config file, class-based dark mode) · `@lucide/svelte` icons · Cloudflare Workers + D1 (untouched).

**Spec:** No separate spec exists; this plan is the source of truth.

## Global Constraints

- Tailwind 4, no config file. Arbitrary values use `_` for spaces (`pb-[calc(5rem_+_env(...))]`).
- Reuse existing components; add no new dependency.
- UI copy Indonesian, code/docs English.
- Verification command: `npm run check && npm run test`. Route/UI behavior is verified manually — this repo has no UI test harness.
- Desktop (`md:` and up) layout must not change.
- Icon names must be non-deprecated exports (use `Ellipsis`, not the deprecated `MoreHorizontal` alias).

## Context (verified against code)

| Fact | Location |
|---|---|
| 7 items, labels `Beranda / Transaksi / Dompet / Hutang / Analitik / Copilot / Pengaturan` | `src/lib/components/Navigation.svelte:15-23` |
| Desktop sidebar (keep as-is) | `src/lib/components/Navigation.svelte:26-65` |
| Mobile bar `grid-cols-7`, active = exact pathname match | `src/lib/components/Navigation.svelte:67-88` |
| `ModalShell` (backdrop + panel, `modalAccessibility`, `fade`/`scale` gated by `prefersReducedMotion`) | `src/lib/components/ModalShell.svelte` |
| `modalAccessibility` (Escape + focus trap + focus restore) | `src/lib/modalAccessibility.ts` |
| `ThemeToggle` | `src/lib/components/ThemeToggle.svelte` |
| Logout form `action="/?/logout"` and its action | `Navigation.svelte:56`, `src/routes/+page.server.ts:44-47` |
| Content wrapper padding | `src/routes/+layout.svelte:11` |

## Decisions (locked)

- Labels stay `Hutang` and `Copilot` — they match the desktop sidebar, `docs/data-model.md` copy, and avoid rename churn.
- Primary mobile: Beranda `/`, Transaksi `/transactions`, Dompet `/wallets`, Analitik `/analytics`.
- Secondary (in the sheet): Hutang `/hutang`, Copilot `/copilot`, Pengaturan `/settings`.
- The sheet is `ModalShell variant="sheet"`, not a new component.
- Active state = exact `page.url.pathname === href` (same rule as the current code). "Lainnya" is active when the sheet is open or a secondary route is active.
- The sheet closes on navigation via `afterNavigate`.
- Wrapper padding becomes `pb-[calc(5rem_+_env(safe-area-inset-bottom))]` — the current `pb-20` ignores the iOS safe area.

## Dependencies

- None. Sibling plan `debt-delete-with-payments.md` shares no files.

## Files / Areas Likely Affected

- Modify: `src/lib/components/ModalShell.svelte`, `src/lib/components/Navigation.svelte`, `src/routes/+layout.svelte`
- Create: none

## Implementation Steps

### Task 1: `ModalShell` gains a sheet variant

Files: `src/lib/components/ModalShell.svelte`

- [ ] **Step 1.1** Import `fly` and add the `variant` prop:

```svelte
	import { fade, fly, scale } from 'svelte/transition';
```

```svelte
		variant = 'center',
```

```svelte
		variant?: 'center' | 'sheet';
```

- [ ] **Step 1.2** Make the backdrop alignment variant-dependent:

```svelte
		class="fixed inset-0 z-50 flex justify-center {variant === 'sheet'
			? 'items-end'
			: 'items-center p-4'} bg-slate-950/50"
```

- [ ] **Step 1.3** Branch the panel so each variant gets its own transition (one element cannot hold two conditional transitions):

```svelte
		{#if variant === 'sheet'}
			<div
				class="card w-full {width} space-y-4 rounded-b-none rounded-t-2xl p-5 shadow-lg"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				aria-labelledby={labelledby}
				tabindex="-1"
				use:modalAccessibility={{ onClose }}
				transition:fly={{ y: '100%', duration: prefersReducedMotion.current ? 0 : 200 }}
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				{@render children?.()}
			</div>
		{:else}
			<div
				class="card w-full {width} space-y-4 p-5 shadow-lg"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				aria-labelledby={labelledby}
				tabindex="-1"
				use:modalAccessibility={{ onClose }}
				transition:scale={{ start: 0.96, duration: prefersReducedMotion.current ? 0 : 140 }}
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				{@render children?.()}
			</div>
		{/if}
```

The existing panel markup moves verbatim into the `{:else}` branch; `ConfirmModal` and every other call site pass no `variant` and behave identically.

- [ ] **Step 1.4** Run `npm run check` → 0 errors.

### Task 2: `Navigation.svelte` — 5-slot bar + bottom sheet

Files: `src/lib/components/Navigation.svelte`

- [ ] **Step 2.1** Update imports and add the tag/grouping state (script block):

```svelte
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Home, ArrowLeftRight, BarChart3, Sparkles, Settings, LogOut, Wallet, HandCoins, Ellipsis, X
	} from '@lucide/svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';

	const items = [
		{ href: '/', label: 'Beranda', icon: Home, group: 'primary' },
		{ href: '/transactions', label: 'Transaksi', icon: ArrowLeftRight, group: 'primary' },
		{ href: '/wallets', label: 'Dompet', icon: Wallet, group: 'primary' },
		{ href: '/hutang', label: 'Hutang', icon: HandCoins, group: 'secondary', subtitle: 'Hutang & piutang' },
		{ href: '/analytics', label: 'Analitik', icon: BarChart3, group: 'primary' },
		{ href: '/copilot', label: 'Copilot', icon: Sparkles, group: 'secondary', subtitle: 'Tanya soal keuanganmu' },
		{ href: '/settings', label: 'Pengaturan', icon: Settings, group: 'secondary', subtitle: 'Password & penyedia AI' }
	];
	const primaryMobileItems = items.filter((i) => i.group === 'primary');
	const secondaryMobileItems = items.filter((i) => i.group === 'secondary');

	let isMoreOpen = $state(false);
	const isMoreActive = $derived(
		isMoreOpen || secondaryMobileItems.some((i) => page.url.pathname === i.href)
	);
	afterNavigate(() => {
		isMoreOpen = false;
	});
```

`items` keeps the original desktop order — `Hutang` still sits between `Dompet` and `Analitik`.

- [ ] **Step 2.2** Desktop sidebar: **unchanged** (lines 26-65 stay exactly as they are).
- [ ] **Step 2.3** Replace the mobile `<nav>` block (lines 67-88) with the 5-column bar plus trigger:

```svelte
<nav
	aria-label="Navigasi utama"
	class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden"
>
	<div class="grid grid-cols-5">
		{#each primaryMobileItems as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex flex-col items-center gap-0.5 py-3 text-[11px] transition-colors
					{active
					? 'font-semibold text-orange-600 dark:text-orange-400'
					: 'text-slate-500 dark:text-slate-400'}"
			>
				<item.icon size={20} />
				{item.label}
			</a>
		{/each}
		<button
			type="button"
			onclick={() => (isMoreOpen = true)}
			aria-haspopup="dialog"
			aria-expanded={isMoreOpen}
			class="flex flex-col items-center gap-0.5 py-3 text-[11px] transition-colors
				{isMoreActive
				? 'font-semibold text-orange-600 dark:text-orange-400'
				: 'text-slate-500 dark:text-slate-400'}"
		>
			<Ellipsis size={20} />
			Lainnya
		</button>
	</div>
</nav>
```

- [ ] **Step 2.4** Add the sheet immediately after the mobile `<nav>`:

```svelte
<ModalShell variant="sheet" open={isMoreOpen} title="Menu Lainnya" onClose={() => (isMoreOpen = false)}>
	<div class="flex items-center justify-between">
		<h3 class="font-semibold">Menu Lainnya</h3>
		<button class="btn btn-ghost p-1.5" aria-label="Tutup menu" onclick={() => (isMoreOpen = false)}>
			<X size={18} />
		</button>
	</div>
	<nav class="space-y-1" aria-label="Menu lainnya">
		{#each secondaryMobileItems as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex items-center gap-3 rounded-lg px-3 py-2.5 {active
					? 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
					: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}"
			>
				<item.icon size={20} />
				<span class="flex flex-col">
					<span class="text-sm font-medium">{item.label}</span>
					<span class="text-xs text-slate-500 dark:text-slate-400">
						{'subtitle' in item ? item.subtitle : ''}
					</span>
				</span>
			</a>
		{/each}
	</nav>
	<div class="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
		<ThemeToggle />
		<form method="POST" action="/?/logout" class="flex-1">
			<button
				type="submit"
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400"
			>
				<LogOut size={17} /> Keluar
			</button>
		</form>
	</div>
</ModalShell>
```

The `{'subtitle' in item ? item.subtitle : ''}` guard is what keeps TypeScript happy: `filter` does not narrow the union, so `item` may be a primary entry without `subtitle`.

- [ ] **Step 2.5** Run `npm run check` → 0 errors.

### Task 3: Layout clearance

Files: `src/routes/+layout.svelte`

- [ ] **Step 3.1** Replace `pb-20` on the content wrapper (line 11) with a safe-area aware value. Tailwind needs `_` for spaces and CSS `calc` needs spaces around `+`:

```svelte
	<div class="min-h-screen pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
```

- [ ] **Step 3.2** Run `npm run check` → 0 errors.

## Acceptance Criteria

- At 360-430px width: 5 equal slots, no label truncation, comfortable tap targets.
- "Lainnya" opens a bottom sheet; tapping any secondary item navigates and the sheet closes.
- Escape, backdrop click, and the X button each close the sheet; focus returns to the "Lainnya" trigger.
- Theme toggle and logout work from inside the sheet.
- On a secondary route (e.g. `/hutang`) the "Lainnya" slot shows the active style.
- Desktop `>=768px`: sidebar identical to before; no mobile bar.
- `npm run check` green.

## Verification / Tests

- `npm run check` — TypeScript strict + Svelte; catches prop/short-circuit mistakes.
- `npm run test` — no changes expected; must still be green.
- Manual (no UI test harness in this repo): `npm run dev`, DevTools device toolbar at 360px and 430px:
  1. Bar shows 5 slots, no truncation.
  2. Tap "Lainnya" → sheet slides up; focus lands inside the sheet.
  3. Tap "Hutang" → navigates, sheet closes, "Lainnya" shows active style.
  4. Escape / backdrop / X each close it; focus returns to the trigger.
  5. Toggle theme and log out from the sheet.
  6. Widen to `>=768px` → sidebar unchanged, bottom bar hidden, no extra bottom padding.
- Reduced motion: with `prefers-reduced-motion: reduce`, the sheet appears without animation.

## Git

- Branch: `feature/mobile-bottom-nav-sheet`
- Suggested commits:
  1. `feat(ui): add sheet variant to ModalShell`
  2. `feat(nav): 5-slot mobile bar with Lainnya bottom sheet`
  3. `fix(layout): safe-area aware mobile bottom padding`

## Deployment

No schema change, no migration, no env change. Normal push to `main`.

## Integration Notes

- Sibling plan `debt-delete-with-payments.md`: **zero shared files** → merge order is free; both may run on parallel branches.
- `ModalShell` gains an optional prop with a default; `ConfirmModal` (no `variant`) and the create/pay modals in `hutang/+page.svelte` are unaffected. Landing after the sibling plan causes no conflict either way.
- No docs update required: no reference doc describes the bottom-nav structure (verified across `docs/`).

## Delegation Strategy

| Step | Owner | Parallel batch | Why |
|------|-------|----------------|-----|
| 1. `ModalShell` sheet variant | designer | A | Component API/UI work; independent file from the layout change |
| 2. `+layout.svelte` padding | builder | A | One-class change, no overlap with step 1 |
| 3. `Navigation.svelte` bar + sheet | designer | - | Depends on the `variant` prop added in step 1 |
| 4. Diff review | reviewer | - | Read-only, after implementation; checks a11y + spec fidelity |

- Batch A = steps 1 + 2 in one message (different files, no shared state).
- Step 3 must wait for step 1 — single owner keeps the component contract consistent.
- Reviewer verifies Escape / focus trap / focus restore against `src/lib/modalAccessibility.ts` and the acceptance criteria.
