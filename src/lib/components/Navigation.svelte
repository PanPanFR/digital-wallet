<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Home,
		ArrowLeftRight,
		Sparkles,
		Settings,
		LogOut,
		Wallet,
		Ellipsis,
		Plus,
		X
	} from '@lucide/svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';

	const items = [
		{ href: '/', label: 'Beranda', icon: Home, group: 'primary' },
		{ href: '/transactions', label: 'Transaksi', icon: ArrowLeftRight, group: 'primary' },
		{ href: '/wallets', label: 'Dompet', icon: Wallet, group: 'primary' },
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

	function openTransactionForm() {
		window.dispatchEvent(new CustomEvent('open-transaction-form'));
	}
</script>

<!-- Desktop sidebar -->
<aside
	class="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ctp-surface0 bg-ctp-mantle md:flex"
>
	<a href="/" class="flex items-center gap-2 border-b border-ctp-surface0 px-4 py-4">
		<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-ctp-peach text-ctp-crust">
			<Wallet size={17} />
		</span>
		<span class="font-semibold text-ctp-text">Digital Wallet</span>
	</a>

	<nav aria-label="Navigasi utama" class="flex-1 space-y-1 overflow-y-auto p-3">
		{#each items as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors
					{active
					? 'bg-ctp-surface0 font-medium text-ctp-peach'
					: 'text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text'}"
			>
				<item.icon size={17} />
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="flex items-center justify-between border-t border-ctp-surface0 p-3">
		<ThemeToggle />
		<form method="POST" action="/?/logout" class="flex-1">
			<button
				type="submit"
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:bg-ctp-red/10 hover:text-ctp-red"
			>
				<LogOut size={17} /> Keluar
			</button>
		</form>
	</div>
</aside>

<!-- Mobile bottom nav: dark floating pill (fixed colors, dark in both modes) -->
<nav
	aria-label="Navigasi utama"
	class="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
>
	<div
		class="nav-pill grid grid-cols-5 items-center rounded-full px-2 py-1.5 shadow-lg backdrop-blur"
	>
		{#each primaryMobileItems.slice(0, 2) as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex min-h-[48px] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] transition-colors
					{active
					? 'font-semibold text-ctp-peach'
					: 'nav-pill-dim'}"
			>
				<item.icon size={20} />
				{item.label}
			</a>
		{/each}
		<div class="flex justify-center">
			<button
				type="button"
				onclick={openTransactionForm}
				aria-label="Catat transaksi"
				class="nav-pill-ring flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-ctp-peach text-white shadow-md ring-4 transition-transform duration-150 active:scale-95 dark:text-ctp-crust"
			>
				<Plus size={22} />
			</button>
		</div>
		{#each primaryMobileItems.slice(2, 3) as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex min-h-[48px] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] transition-colors
					{active
					? 'font-semibold text-ctp-peach'
					: 'nav-pill-dim'}"
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
			class="flex min-h-[48px] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] transition-colors
				{isMoreActive
				? 'font-semibold text-ctp-peach'
				: 'nav-pill-dim'}"
		>
			<Ellipsis size={20} />
			Lainnya
		</button>
	</div>
</nav>

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
					? 'bg-ctp-surface0 text-ctp-peach'
					: 'text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text'}"
			>
				<item.icon size={20} />
				<span class="flex flex-col">
					<span class="text-sm font-medium">{item.label}</span>
					<span class="text-xs text-ctp-subtext1">
						{'subtitle' in item ? item.subtitle : ''}
					</span>
				</span>
			</a>
		{/each}
	</nav>
	<div class="flex items-center justify-between border-t border-ctp-surface0 pt-3">
		<ThemeToggle />
		<form method="POST" action="/?/logout" class="flex-1">
			<button
				type="submit"
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:bg-ctp-red/10 hover:text-ctp-red"
			>
				<LogOut size={17} /> Keluar
			</button>
		</form>
	</div>
</ModalShell>
