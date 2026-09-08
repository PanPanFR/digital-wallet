<script lang="ts">
	import { page } from '$app/state';
	import { Home, ArrowLeftRight, BarChart3, Sparkles, Settings, LogOut, Wallet } from '@lucide/svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	const items = [
		{ href: '/', label: 'Beranda', icon: Home },
		{ href: '/transactions', label: 'Transaksi', icon: ArrowLeftRight },
		{ href: '/wallets', label: 'Dompet', icon: Wallet },
		{ href: '/analytics', label: 'Analitik', icon: BarChart3 },
		{ href: '/copilot', label: 'Copilot', icon: Sparkles },
		{ href: '/settings', label: 'Pengaturan', icon: Settings }
	];
</script>

<!-- Desktop sidebar -->
<aside
	class="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:flex"
>
	<a href="/" class="flex items-center gap-2 border-b border-gray-200 px-4 py-4 dark:border-gray-800">
		<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
			<Wallet size={17} />
		</span>
		<span class="font-semibold text-gray-900 dark:text-white">Finance Tracker</span>
	</a>

	<nav aria-label="Navigasi utama" class="flex-1 space-y-1 overflow-y-auto p-3">
		{#each items as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm
					{active
					? 'bg-sky-50 font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-400'
					: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'}"
			>
				<item.icon size={17} />
				{item.label}
			</a>
		{/each}
	</nav>

	<div class="flex items-center justify-between border-t border-gray-200 p-3 dark:border-gray-800">
		<ThemeToggle />
		<form method="POST" action="/?/logout" class="flex-1">
			<button
				type="submit"
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
			>
				<LogOut size={17} /> Keluar
			</button>
		</form>
	</div>
</aside>

<!-- Mobile bottom nav -->
<nav
	aria-label="Navigasi utama"
	class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:hidden"
>
	<div class="grid grid-cols-6">
		{#each items as item (item.href)}
			{@const active = page.url.pathname === item.href}
			<a
				href={item.href}
				aria-current={active ? 'page' : undefined}
				class="flex flex-col items-center gap-0.5 py-2.5 text-[11px]
					{active
					? 'font-medium text-sky-600 dark:text-sky-400'
					: 'text-gray-500 dark:text-gray-400'}"
			>
				<item.icon size={19} />
				{item.label}
			</a>
		{/each}
	</div>
</nav>
