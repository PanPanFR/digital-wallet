<script lang="ts">
	import { navigating } from '$app/state';
	import { prefersReducedMotion } from 'svelte/motion';
	import {
		Plus,
		ArrowUpRight,
		ArrowDownLeft,
		ArrowLeftRight,
		Wallet,
		Smartphone,
		Banknote,
		HandCoins
	} from '@lucide/svelte';
	import { BarChart } from 'layerchart/svg';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { formatIDR, formatDate } from '$lib/format';

	let { data } = $props();

	let showForm = $state(false);

	const reduceMotion = $derived(prefersReducedMotion.current);
	const trendSeries = [
		{ key: 'income', label: 'Pemasukan', color: 'var(--color-ctp-green)' },
		{ key: 'expense', label: 'Pengeluaran', color: 'var(--color-ctp-red)' }
	];
	const hasTrend = $derived(
		Array.isArray(data.trend) && data.trend.some((t) => t.income > 0 || t.expense > 0)
	);

	const idrCompact = new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		notation: 'compact',
		maximumFractionDigits: 1
	});

	function compactIDR(value: unknown): string {
		const n = typeof value === 'number' ? value : Number(value);
		return Number.isFinite(n) ? idrCompact.format(n) : '';
	}

	function monthShort(ym: string): string {
		return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(
			new Date(`${ym}-01T00:00:00`)
		);
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
</script>

<svelte:head>
	<title>Beranda · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="page-header">
		<div>
			<h1 class="page-title">Beranda</h1>
			<p class="page-subtitle">
				{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
					new Date(`${data.month}-01T00:00:00`)
				)}
			</p>
		</div>
		<form method="GET" action="/" class="flex items-center gap-2">
			<label for="month" class="sr-only">Bulan</label>
			<input
				id="month"
				name="month"
				type="month"
				value={data.month}
				onchange={onMonthChange}
				class="input w-auto px-2.5 py-1.5"
			/>
		</form>
		<button
			onclick={() => (showForm = true)}
			class="btn btn-primary px-3 py-2"
		>
			<Plus size={16} /> Catat
		</button>
	</div>

	<section
		class="rounded-xl bg-ctp-peach p-5"
		aria-label="Total saldo"
	>
		<div class="flex items-center gap-1.5 text-xs text-white dark:text-ctp-crust/80">
			<span><Wallet size={14} /></span>
			Total Saldo
		</div>
		<p class="num mt-1 text-3xl font-bold tabular-nums text-white dark:text-ctp-crust">
			{formatIDR(data.totals.total)}
		</p>
	</section>

	<section class="mt-3 grid grid-cols-2 gap-3" aria-label="Saldo per jenis dompet">
		<div class="card p-4">
			<div class="flex items-center gap-1.5 text-xs text-ctp-subtext1">
				<span class="tile h-6 w-6 bg-ctp-surface0 text-ctp-subtext1"><Smartphone size={14} /></span>
				Digital
			</div>
			<p class="num mt-1 text-lg font-bold tabular-nums text-ctp-text">
				{formatIDR(data.totals.digital)}
			</p>
		</div>

		<div class="card p-4">
			<div class="flex items-center gap-1.5 text-xs text-ctp-subtext1">
				<span class="tile h-6 w-6 bg-ctp-surface0 text-ctp-subtext1"><Banknote size={14} /></span>
				Tunai
			</div>
			<p class="num mt-1 text-lg font-bold tabular-nums text-ctp-text">
				{formatIDR(data.totals.cash)}
			</p>
		</div>
	</section>

	<section class="card mt-3 p-4" aria-label="Tren 6 bulan terakhir">
		<div class="section-header">
			<h2 class="section-title">Tren 6 Bulan</h2>
			<div class="flex items-center gap-3 text-xs text-ctp-subtext1">
				<span class="flex items-center gap-1">
					<span class="h-2.5 w-2.5 rounded-sm bg-ctp-green" aria-hidden="true"></span>
					Pemasukan
				</span>
				<span class="flex items-center gap-1">
					<span class="h-2.5 w-2.5 rounded-sm bg-ctp-red" aria-hidden="true"></span>
					Pengeluaran
				</span>
			</div>
		</div>
		{#if hasTrend}
			<div
				class="h-56"
				role="img"
				aria-label="Grafik batang tren pemasukan dan pengeluaran enam bulan terakhir"
			>
				<BarChart
					data={data.trend}
					x="month"
					series={trendSeries}
					seriesLayout="group"
					height={224}
					yDomain={[0, null]}
					motion={reduceMotion ? 'none' : undefined}
					props={{
						xAxis: { format: (v: unknown) => monthShort(String(v)) },
						yAxis: { format: (v: unknown) => compactIDR(v) },
						tooltip: {
							root: { motion: reduceMotion ? 'none' : 'spring' },
							header: { format: (v: unknown) => monthLong(String(v)) },
							item: { format: (v: unknown) => formatIDR(Number(v) || 0) },
							hideTotal: true
						}
					}}
				/>
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-ctp-subtext0">
				Belum ada data tren enam bulan terakhir.
			</p>
		{/if}
	</section>

	{#if data.debtTotals.owe > 0 || data.debtTotals.owed > 0}
		<a
			href="/hutang"
			aria-label="Ringkasan hutang dan piutang"
			class="card mt-3 flex items-center justify-between gap-3 p-4 transition-colors duration-150 hover:bg-ctp-surface0"
		>
			<div>
				<div class="flex items-center gap-1.5 text-xs text-ctp-subtext1">
					<span class="text-ctp-overlay1"><HandCoins size={14} /></span>
					Hutang &amp; Piutang
				</div>
				<p class="mt-1 text-sm">
					<span class="num font-bold tabular-nums text-ctp-red">
						−Hutang {formatIDR(data.debtTotals.owe)}
					</span>
					<span class="text-ctp-overlay0"> · </span>
					<span class="num font-bold tabular-nums text-ctp-green">
						+Piutang {formatIDR(data.debtTotals.owed)}
					</span>
				</p>
			</div>
			<ArrowUpRight size={16} class="text-ctp-overlay1" />
		</a>
	{/if}

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
									: 'bg-ctp-surface0 text-ctp-subtext1'}"
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
								<span
									class="chip bg-ctp-surface0 text-ctp-subtext1"
								>
									→ {tx.dest_wallet_name}
								</span>
							{/if}
								<span
									class="chip bg-ctp-surface0 text-ctp-subtext1"
								>
									{tx.wallet_name}
								</span>
							</p>
						</div>
						<span
							class="num whitespace-nowrap text-sm font-bold tabular-nums
							{tx.type === 'transfer'
								? 'text-ctp-subtext1'
								: tx.type === 'income'
									? 'text-ctp-green'
									: 'text-ctp-red'}"
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
