<script lang="ts">
	import { navigating } from '$app/state';
	import {
		Plus,
		ArrowUpRight,
		TrendingDown,
		TrendingUp,
		Wallet,
		Smartphone,
		Banknote
	} from '@lucide/svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { formatIDR, formatDate } from '$lib/format';

	let { data } = $props();

	let showForm = $state(false);

	const groups = $derived([
		{ label: 'Digital', wallets: data.wallets.filter((w: { kind: string }) => w.kind === 'digital') },
		{ label: 'Tunai', wallets: data.wallets.filter((w: { kind: string }) => w.kind === 'cash') }
	]);
</script>

<svelte:head>
	<title>Beranda · Finance Tracker</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="mb-4 flex items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Beranda</h1>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
					new Date(`${data.month}-01T00:00:00`)
				)}
			</p>
		</div>
		<button
			onclick={() => (showForm = true)}
			class="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium"
		>
			<Plus size={16} /> Catat
		</button>
	</div>

	<section
		class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
		aria-label="Total saldo"
	>
		<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
			<span class="text-sky-500"><Wallet size={14} /></span>
			Total Saldo
		</div>
		<p
			class="mt-1 font-mono text-3xl font-bold
			{data.totals.total < 0
				? 'text-red-600 dark:text-red-400'
				: 'text-gray-900 dark:text-white'}"
		>
			{formatIDR(data.totals.total)}
		</p>
	</section>

	<section class="mt-3 grid grid-cols-2 gap-3" aria-label="Saldo per jenis dompet">
		<div
			class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-indigo-500"><Smartphone size={14} /></span>
				Digital
			</div>
			<p class="mt-1 font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400">
				{formatIDR(data.totals.digital)}
			</p>
		</div>

		<div
			class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-emerald-500"><Banknote size={14} /></span>
				Tunai
			</div>
			<p class="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
				{formatIDR(data.totals.cash)}
			</p>
		</div>
	</section>

	<section class="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Ringkasan bulan ini">
		<div
			class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-emerald-500"><TrendingUp size={14} /></span>
				Pemasukan
			</div>
			<p class="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
				{formatIDR(data.summary.income)}
			</p>
		</div>

		<div
			class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-red-500"><TrendingDown size={14} /></span>
				Pengeluaran
			</div>
			<p class="mt-1 font-mono text-lg font-bold text-red-600 dark:text-red-400">
				{formatIDR(data.summary.expense)}
			</p>
		</div>

		<div
			class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-sky-500"><Wallet size={14} /></span>
				Saldo Bersih
			</div>
			<p
				class="mt-1 font-mono text-lg font-bold
				{data.summary.net < 0
					? 'text-red-600 dark:text-red-400'
					: 'text-gray-900 dark:text-white'}"
			>
				{formatIDR(data.summary.net)}
			</p>
		</div>
	</section>

	<section class="mt-6" aria-label="Daftar dompet">
		<h2 class="mb-2 font-semibold text-gray-900 dark:text-white">Dompet</h2>

		{#if data.wallets.length === 0}
			<p
				class="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
			>
				Belum ada dompet.
			</p>
		{:else}
			<div class="space-y-4">
				{#each groups as group (group.label)}
					{#if group.wallets.length > 0}
						<h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">{group.label}</h3>
						<ul
							class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
						>
							{#each group.wallets as w (w.id)}
								<li class="flex items-center justify-between gap-3 px-4 py-3">
									<span class="truncate text-sm font-medium text-gray-900 dark:text-white">
										{w.name}
									</span>
									<span
										class="whitespace-nowrap font-mono text-sm font-bold
										{w.balance < 0
											? 'text-red-600 dark:text-red-400'
											: 'text-gray-900 dark:text-white'}"
									>
										{formatIDR(w.balance)}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</div>
		{/if}
	</section>

	<section class="mt-6" aria-label="Transaksi terakhir">
		<div class="mb-2 flex items-center justify-between">
			<h2 class="font-semibold text-gray-900 dark:text-white">Transaksi Terakhir</h2>
			<a
				href="/transactions"
				class="flex items-center gap-0.5 text-sm text-sky-600 hover:underline dark:text-sky-400"
			>
				Lihat semua <ArrowUpRight size={14} />
			</a>
		</div>

		{#if navigating.to?.url.pathname === '/'}
			<Skeleton rows={4} />
		{:else if data.recent.length === 0}
			<p
				class="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
			>
				Belum ada transaksi.
			</p>
		{:else}
			<ul
				class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
			>
				{#each data.recent as tx (tx.id)}
					<li class="flex items-center gap-3 px-4 py-3">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
								{tx.description}
							</p>
							<p class="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
								<span>{tx.category} · {formatDate(tx.created_at)}</span>
								<span
									class="rounded-full px-1.5 py-0.5 font-medium
									{tx.wallet_kind === 'digital'
										? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
										: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}"
								>
									{tx.wallet_name}
								</span>
							</p>
						</div>
						<span
							class="whitespace-nowrap font-mono text-sm font-bold
							{tx.type === 'income'
								? 'text-emerald-600 dark:text-emerald-400'
								: 'text-red-600 dark:text-red-400'}"
						>
							{tx.type === 'income' ? '+' : '−'}{formatIDR(tx.amount)}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<TransactionForm
	open={showForm}
	onclose={() => (showForm = false)}
	wallets={data.wallets}
/>
