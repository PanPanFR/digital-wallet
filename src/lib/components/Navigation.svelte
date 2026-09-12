<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Home,
		ArrowLeftRight,
		BarChart3,
		Sparkles,
		Settings,
		LogOut,
		Wallet,
		HandCoins,
		Ellipsis,
		X
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
</script>

<!-- Desktop sidebar -->
<aside
	class="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex"
>
	<a href="/" class="flex items-center gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
		<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white">
			<Wallet size={17} />
		</span>
		<span class="font-semibold text-slate-900 dark:text-white">Digital Wallet</span>
	</a>

	<nav aria-label="Navigasi utama" class="flex-1 space-y-1 overflow-y-auto p-3">
		{#each items as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors
					{active
					? 'bg-orange-50 font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-400'
					: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}"
			>
				<item.icon size={17} />
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="flex items-center justify-between border-t border-slate-200 p-3 dark:border-slate-800">
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
</aside>

<!-- Mobile bottom nav -->
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
