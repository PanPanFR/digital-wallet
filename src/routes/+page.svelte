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
		HandCoins,
		BarChart3
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

	// Opened by the mobile nav Catat FAB via window event (no shared state).
	$effect(() => {
		const open = () => {
			showForm = true;
		};
		window.addEventListener('open-transaction-form', open);
		return () => window.removeEventListener('open-transaction-form', open);
	});

	const monthLongLabel = $derived(monthLong(data.month));
	const insightIncome = $derived(data.summary.income);
	const insightExpense = $derived(data.summary.expense);
	const insightPct = $derived(
		insightIncome > 0
			? Math.min(100, Math.round((insightExpense / insightIncome) * 100))
			: insightExpense > 0
				? 100
				: 0
	);
</script>

<svelte:head>
	<title>Beranda · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
	<div class="page-header">
		<div>
			<h1 class="page-title">Halo</h1>
			<p class="page-subtitle">{monthLongLabel}</p>
		</div>
		<div class="flex items-center gap-2">
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
	</div>

	<section
		class="rounded-xl bg-ctp-blue p-5"
		aria-label="Total saldo"
	>
		<div class="flex items-center gap-1.5 text-xs text-white/85">
			<span aria-hidden="true"><Wallet size={14} /></span>
			Total Saldo
		</div>
		<p class="currency-display num mt-1 text-white">
			{formatIDR(data.totals.total)}
		</p>
		<button
			onclick={() => (showForm = true)}
			class="btn btn-primary mt-3 px-4 py-2"
		>
			<Plus size={16} /> Catat
		</button>
	</section>

	<section class="mt-3 grid grid-cols-4 gap-3" aria-label="Aksi cepat">
		<button
			onclick={() => (showForm = true)}
			class="flex flex-col items-center gap-1.5"
		>
			<span class="tile h-12 w-12 bg-ctp-peach/15 text-ctp-peach" aria-hidden="true"><Plus size={20} /></span>
			<span class="text-xs font-medium text-ctp-text">Catat</span>
		</button>
		<a href="/transactions" class="flex flex-col items-center gap-1.5">
			<span class="tile h-12 w-12 bg-ctp-blue/15 text-ctp-blue" aria-hidden="true"><ArrowLeftRight size={20} /></span>
			<span class="text-xs font-medium text-ctp-text">Transfer</span>
		</a>
		<a href="/wallets" class="flex flex-col items-center gap-1.5">
			<span class="tile h-12 w-12 bg-ctp-lavender/15 text-ctp-lavender" aria-hidden="true"><Wallet size={20} /></span>
			<span class="text-xs font-medium text-ctp-text">Dompet</span>
		</a>
		<a href="/analytics" class="flex flex-col items-center gap-1.5">
			<span class="tile h-12 w-12 bg-ctp-teal/15 text-ctp-teal" aria-hidden="true"><BarChart3 size={20} /></span>
			<span class="text-xs font-medium text-ctp-text">Analitik</span>
		</a>
	</section>

	<section class="card mt-3 p-4" aria-label="Wawasan bulan ini">
		<div class="section-header">
			<h2 class="section-title">Wawasan {monthLongLabel}</h2>
		</div>
		{#if insightIncome === 0 && insightExpense === 0}
			<p class="text-sm text-ctp-subtext0">Belum ada pemasukan maupun pengeluaran bulan ini.</p>
		{:else}
			<p class="text-sm text-ctp-text">
				{#if insightIncome === 0}
					Belum ada pemasukan bulan ini.
				{:else}
					Pengeluaran <strong class="num tabular-nums">{insightPct}%</strong> dari pemasukan.
				{/if}
			</p>
			<div
				class="mt-2 h-2 overflow-hidden rounded-full bg-ctp-crust"
				role="img"
				aria-label="Pengeluaran {insightPct}% dari pemasukan bulan ini"
			>
				<div
					class="h-full rounded-full bg-ctp-peach"
					style="width: {insightPct}%"
				></div>
			</div>
			<p class="num mt-2 text-xs tabular-nums text-ctp-subtext0">
				<span class="font-semibold text-ctp-green">+ {formatIDR(insightIncome)}</span>
				<span aria-hidden="true"> · </span>
				<span class="font-semibold text-ctp-red">− {formatIDR(insightExpense)}</span>
			</p>
		{/if}
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
			class="card mt-3 grid grid-cols-2 divide-x divide-ctp-surface0 overflow-hidden transition-colors duration-150 hover:bg-ctp-surface0"
		>
			<div class="p-4">
				<div class="flex items-center gap-1.5 text-xs text-ctp-subtext1">
					<span class="tile h-6 w-6 bg-ctp-red/15 text-ctp-red" aria-hidden="true"><HandCoins size={14} /></span>
					Hutang Saya
				</div>
				<p class="num mt-1 text-sm font-bold tabular-nums text-ctp-red">
					− {formatIDR(data.debtTotals.owe)}
				</p>
			</div>
			<div class="p-4">
				<div class="flex items-center gap-1.5 text-xs text-ctp-subtext1">
					<span class="tile h-6 w-6 bg-ctp-green/15 text-ctp-green" aria-hidden="true"><HandCoins size={14} /></span>
					Piutang Saya
				</div>
				<p class="num mt-1 text-sm font-bold tabular-nums text-ctp-green">
					+ {formatIDR(data.debtTotals.owed)}
				</p>
			</div>
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
	onclose={() => (showForm = false)}
	wallets={data.wallets}
/>
