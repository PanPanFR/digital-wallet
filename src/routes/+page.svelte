<script lang="ts">
	import { navigating } from '$app/state';
	import {
		Plus,
		ArrowUpRight,
		ArrowDownLeft,
		ArrowLeftRight,
		Wallet,
		Smartphone,
		Banknote
	} from '@lucide/svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { formatIDR, formatDate } from '$lib/format';

	let { data } = $props();

	let showForm = $state(false);
	let formPreset = $state<'income' | 'expense'>('expense');

	function openForm(preset: 'income' | 'expense') {
		formPreset = preset;
		showForm = true;
	}

	function monthLong(ym: string): string {
		return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
			new Date(`${ym}-01T00:00:00`)
		);
	}

	function onMonthChange(e: Event) {
		(e.currentTarget as HTMLFormElement).requestSubmit();
	}

	const groups = $derived([
		{ label: 'Digital', wallets: data.wallets.filter((w: { kind: string }) => w.kind === 'digital') },
		{ label: 'Tunai', wallets: data.wallets.filter((w: { kind: string }) => w.kind === 'cash') }
	]);

	// Opened by the mobile nav Catat FAB via window event (no shared state).
	$effect(() => {
		const open = () => {
			showForm = true;
		};
		window.addEventListener('open-transaction-form', open);
		return () => window.removeEventListener('open-transaction-form', open);
	});

	const monthLongLabel = $derived(monthLong(data.month));
</script>

<svelte:head>
	<title>Beranda · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
	<div class="page-header flex-wrap">
		<div>
			<h1 class="page-title">Halo</h1>
			<p class="page-subtitle">{monthLongLabel}</p>
		</div>
		<form method="GET" action="/" class="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
			<label for="month" class="sr-only">Bulan</label>
			<input
				id="month"
				name="month"
				type="month"
				value={data.month}
				onchange={onMonthChange}
				class="input min-w-0 flex-1 px-2.5 py-1.5 sm:w-auto sm:flex-none"
			/>
		</form>
	</div>

	<section
		class="rounded-xl bg-ctp-blue p-5"
		aria-label="Total saldo"
	>
		<div class="flex items-center gap-1.5 text-xs text-white/85 dark:text-ctp-crust/85">
			<span aria-hidden="true"><Wallet size={14} /></span>
			Total Saldo
		</div>
		<p class="currency-display num mt-1 text-white dark:text-ctp-crust">
			{formatIDR(data.totals.total)}
		</p>
	</section>

	<section class="mt-3 grid grid-cols-2 gap-2" aria-label="Catat transaksi">
		<button
			onclick={() => openForm('income')}
			class="btn min-h-[44px] flex-1 bg-ctp-green/15 font-semibold text-ctp-green"
		>
			<ArrowDownLeft size={18} /> Catat Pemasukan
		</button>
		<button
			onclick={() => openForm('expense')}
			class="btn min-h-[44px] flex-1 bg-ctp-red/15 font-semibold text-ctp-red"
		>
			<ArrowUpRight size={18} /> Catat Pengeluaran
		</button>
	</section>

	<section class="mt-3 grid grid-cols-2 gap-3" aria-label="Saldo per jenis dompet">
		<div class="card min-w-0 p-4">
			<div class="flex items-center gap-1.5 truncate text-xs text-ctp-subtext1">
				<span class="tile h-6 w-6 bg-ctp-surface0 text-ctp-subtext1"><Smartphone size={14} /></span>
				Digital
			</div>
			<p class="num mt-1 truncate text-base font-bold tabular-nums text-ctp-text sm:text-lg">
				{formatIDR(data.totals.digital)}
			</p>
		</div>

		<div class="card min-w-0 p-4">
			<div class="flex items-center gap-1.5 truncate text-xs text-ctp-subtext1">
				<span class="tile h-6 w-6 bg-ctp-surface0 text-ctp-subtext1"><Banknote size={14} /></span>
				Tunai
			</div>
			<p class="num mt-1 truncate text-base font-bold tabular-nums text-ctp-text sm:text-lg">
				{formatIDR(data.totals.cash)}
			</p>
		</div>
	</section>

	<section class="mt-6" aria-label="Daftar dompet">
		<h2 class="section-title mb-2">Dompet</h2>

		{#if data.wallets.length === 0}
			<div
				class="card flex flex-col items-center gap-1 py-10 text-center"
			>
				<Wallet size={28} class="text-ctp-overlay0" />
				<p class="text-sm font-medium text-ctp-text">Belum ada dompet.</p>
				<p class="text-xs text-ctp-subtext0">
					Tambahkan dompet digital atau tunai untuk mulai mencatat.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each groups as group (group.label)}
					{#if group.wallets.length > 0}
						<h3 class="text-xs font-medium text-ctp-subtext0">{group.label}</h3>
						<ul class="list">
							{#each group.wallets as w (w.id)}
								<li>
									<a href="/transactions?wallet={w.id}" class="list-row">
										<span class="tile bg-ctp-surface0 text-ctp-subtext1">
											{#if w.kind === 'digital'}<Smartphone size={16} />{:else}<Banknote size={16} />{/if}
										</span>
										<span class="truncate text-sm font-medium text-ctp-text">
											{w.name}
										</span>
										<span
											class="num ml-auto whitespace-nowrap text-sm font-bold tabular-nums
											{w.balance < 0
												? 'text-ctp-red'
												: 'text-ctp-text'}"
										>
											{formatIDR(w.balance)}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</div>
		{/if}
	</section>

	<section class="mt-6" aria-label="Transaksi terakhir">
		<div class="section-header">
			<h2 class="section-title">Transaksi Terakhir</h2>
			<a
				href="/transactions"
				class="flex items-center gap-0.5 text-sm text-ctp-peach hover:text-ctp-maroon"
			>
				Lihat semua <ArrowUpRight size={14} />
			</a>
		</div>

		{#if navigating.to?.url.pathname === '/'}
			<Skeleton rows={4} />
		{:else if data.recent.length === 0}
			<div class="card flex flex-col items-center gap-1 py-10 text-center">
				<Plus size={28} class="text-ctp-overlay0" />
				<p class="text-sm font-medium text-ctp-text">Belum ada transaksi.</p>
				<p class="text-xs text-ctp-subtext0">
					Tekan Catat untuk menambahkan transaksi pertama.
				</p>
			</div>
		{:else}
			<ul class="list">
				{#each data.recent as tx (tx.id)}
					<li class="flex items-center gap-3 px-4 py-3">
						<span
							class="tile {tx.type === 'income'
								? 'bg-ctp-green/15 text-ctp-green'
								: tx.type === 'expense'
									? 'bg-ctp-red/15 text-ctp-red'
									: 'bg-ctp-blue/15 text-ctp-blue'}"
						>
							{#if tx.type === 'income'}<ArrowDownLeft size={16} />{:else if tx.type === 'expense'}<ArrowUpRight size={16} />{:else}<ArrowLeftRight size={16} />{/if}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-ctp-text">
								{tx.description}
							</p>
							<p class="flex flex-wrap items-center gap-1.5 text-xs text-ctp-subtext0">
								<span>{tx.category} · {formatDate(tx.date)}</span>
							{#if tx.type === 'transfer'}
								<span class="chip">
									→ {tx.dest_wallet_name}
								</span>
							{/if}
								<span class="chip">
									{tx.wallet_name}
								</span>
							</p>
						</div>
						<span
							class="num whitespace-nowrap text-sm font-bold tabular-nums
							{tx.type === 'transfer'
								? 'text-ctp-blue'
								: tx.type === 'income'
									? 'text-ctp-green'
									: 'text-ctp-red'}"
						>
							{tx.type === 'income' ? '+' : '−'} {formatIDR(tx.amount)}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<TransactionForm
	open={showForm}
	initialType={formPreset}
	onclose={() => (showForm = false)}
	wallets={data.wallets}
/>
