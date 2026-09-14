<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { BarChart, PieChart } from 'layerchart/svg';
	import { TrendingDown, TrendingUp, Wallet } from '@lucide/svelte';
	import { formatIDR } from '$lib/format';

	let { data } = $props();

	// Categorical palette shared by the donut + wallet bars (CSS vars, so it
	// follows the light/dark theme). 8 distinct hues, cycling. Green is
	// deliberately excluded: green is reserved for income slices in mixed
	// charts, and this donut is expense-only (never the 3-warm red/peach/maroon cycle).
	const CHART_PALETTE = [
		'var(--color-ctp-blue)',
		'var(--color-ctp-peach)',
		'var(--color-ctp-yellow)',
		'var(--color-ctp-lavender)',
		'var(--color-ctp-teal)',
		'var(--color-ctp-pink)',
		'var(--color-ctp-maroon)',
		'var(--color-ctp-red)'
	];

	// Horizontal bars: category totals for the selected month, as share of total expense / income.
	const sumByType = $derived({
		expense: data.categoryTotals.filter((c) => c.type === 'expense').reduce((s, c) => s + c.total, 0),
		income: data.categoryTotals.filter((c) => c.type === 'income').reduce((s, c) => s + c.total, 0)
	});
	const diff = $derived(sumByType.income - sumByType.expense);
	const catCount = $derived(data.categoryTotals.length);
	// Budget usage = expense share of income (no budget-limit data exists
	// server-side, so this is derived from categoryTotals only).
	const budgetPct = $derived(
		sumByType.income > 0
			? Math.min(100, Math.round((sumByType.expense / sumByType.income) * 100))
			: sumByType.expense > 0
				? 100
				: 0
	);

	/** Signed tabular amount with `+ Rp` / `− Rp` spacing. */
	function signedIDR(value: number): string {
		if (value === 0) return formatIDR(0);
		return `${value < 0 ? '−' : '+'} ${formatIDR(Math.abs(value))}`;
	}
	const monthLabel = $derived(
		new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
			new Date(`${data.month}-01T00:00:00`)
		)
	);

	const reduceMotion = $derived(prefersReducedMotion.current);
	const trendSeries = [
		{ key: 'income', label: 'Pemasukan', color: 'var(--color-ctp-green)' },
		{ key: 'expense', label: 'Pengeluaran', color: 'var(--color-ctp-red)' }
	];
	const hasMonthly = $derived(
		Array.isArray(data.monthlyTotals) &&
			data.monthlyTotals.some((m) => m.income > 0 || m.expense > 0)
	);

	const expenseChart = $derived(data.categoryTotals.filter((c) => c.type === 'expense'));
	const categoryChart = $derived.by(() => {
		const byCategory = new Map<string, { category: string; income: number; expense: number }>();
		for (const c of data.categoryTotals) {
			const cur = byCategory.get(c.category) ?? { category: c.category, income: 0, expense: 0 };
			if (c.type === 'income') cur.income += c.total;
			else cur.expense += c.total;
			byCategory.set(c.category, cur);
		}
		return [...byCategory.values()];
	});
	const categoryChartHeight = $derived(
		Math.min(520, Math.max(200, categoryChart.length * 36 + 80))
	);

	const walletChart = $derived(data.walletTotals.map((w) => ({ name: w.name, total: w.total })));
	const walletChartHeight = $derived(
		Math.min(380, Math.max(160, walletChart.length * 36 + 70))
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

	function shortLabel(value: unknown): string {
		const s = String(value ?? '');
		return s.length > 16 ? `${s.slice(0, 15)}…` : s;
	}

	function monthShort(ym: string) {
		return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${ym}-01T00:00:00`));
	}

	function monthLong(ym: string) {
		return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
			new Date(`${ym}-01T00:00:00`)
		);
	}

	function onMonthChange(e: Event) {
		(e.currentTarget as HTMLFormElement).requestSubmit();
	}
</script>

<svelte:head>
	<title>Analitik · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
	<div class="page-header flex-wrap">
		<div>
			<h1 class="page-title">Analitik</h1>
			<p class="page-subtitle">{monthLabel}</p>
		</div>
		<form method="GET" action="/analytics" class="flex items-center gap-2">
			<label for="month" class="text-sm text-ctp-subtext0">Bulan</label>
			<input id="month" name="month" type="month" value={data.month} onchange={onMonthChange} class="input w-auto px-2.5 py-1.5" />
		</form>
	</div>

	<!-- Dark summary card: donut + 4-way legend (dark in both modes) -->
	<section aria-label="Ringkasan" class="mb-6">
		<div class="card-dark p-5">
			<div class="mb-4 flex items-center justify-between gap-2">
				<h2 class="text-base font-bold">Ringkasan</h2>
				<span class="text-xs text-white/70">{monthLabel}</span>
			</div>
			{#if data.categoryTotals.length === 0}
				<p class="py-6 text-center text-sm text-white/70">
					Tidak ada data untuk {monthLabel}.
				</p>
			{:else}
				{#if sumByType.expense > 0}
					{@const expenseCats = data.categoryTotals.filter((c) => c.type === 'expense')}
					<div class="flex flex-col items-center gap-5 sm:flex-row">
						<div class="relative h-40 w-40 shrink-0">
							<div
								class="h-full w-full"
								role="img"
								aria-label="Proporsi pengeluaran per kategori"
							>
								<PieChart
									data={expenseCats}
									key="category"
									label="category"
									value="total"
									c="category"
									cRange={CHART_PALETTE}
									innerRadius={0.65}
									motion={reduceMotion ? 'none' : undefined}
									props={{
										tooltip: {
											root: { motion: reduceMotion ? 'none' : 'spring' },
											item: { format: (v: unknown) => formatIDR(Number(v) || 0) }
										}
									}}
								/>
							</div>
							<div
								class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
								aria-hidden="true"
							>
								<span class="text-[11px] leading-none text-white/70">Pengeluaran</span>
								<span class="num mt-1 text-sm leading-tight font-bold text-white">
									{compactIDR(sumByType.expense)}
								</span>
							</div>
						</div>
						<ul class="w-full space-y-1.5 text-sm" aria-label="Legenda proporsi pengeluaran">
							{#each expenseCats as cat, i (cat.category)}
								{@const pct = Math.round((cat.total / sumByType.expense) * 100)}
								<li class="flex items-center gap-2">
									<span
										class="h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {CHART_PALETTE[i % CHART_PALETTE.length]}"
										aria-hidden="true"
									></span>
									<span class="truncate text-white/85">{cat.category}</span>
									<span class="num ml-auto shrink-0 tabular-nums text-white/70">{pct}%</span>
									<span class="num shrink-0 font-semibold tabular-nums text-white">
										{formatIDR(cat.total)}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="py-2 text-center text-sm text-white/70">
						Belum ada pengeluaran bulan ini.
					</p>
				{/if}
				<dl class="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
					<div class="flex items-center justify-between gap-2">
						<dt class="flex items-center gap-2 text-white/70">
							<span class="h-2.5 w-2.5 shrink-0 rounded-full bg-ctp-green" aria-hidden="true"></span>
							Total Pemasukan
						</dt>
						<dd class="num font-bold tabular-nums text-white">+ {formatIDR(sumByType.income)}</dd>
					</div>
					<div class="flex items-center justify-between gap-2">
						<dt class="flex items-center gap-2 text-white/70">
							<span class="h-2.5 w-2.5 shrink-0 rounded-full bg-ctp-red" aria-hidden="true"></span>
							Total Pengeluaran
						</dt>
						<dd class="num font-bold tabular-nums text-white">− {formatIDR(sumByType.expense)}</dd>
					</div>
					<div class="flex items-center justify-between gap-2">
						<dt class="flex items-center gap-2 text-white/70">
							<span class="h-2.5 w-2.5 shrink-0 rounded-full bg-white" aria-hidden="true"></span>
							Selisih
						</dt>
						<dd class="num font-bold tabular-nums text-white">{signedIDR(diff)}</dd>
					</div>
					<div class="flex items-center justify-between gap-2">
						<dt class="flex items-center gap-2 text-white/70">
							<span class="h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" aria-hidden="true"></span>
							Kategori aktif
						</dt>
						<dd class="num font-bold tabular-nums text-white/70">{catCount}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</section>

	<!-- Budget card: solid progress bar + usage chip + condition line -->
	<section aria-label="Anggaran bulan ini" class="mb-6">
		<div class="card p-5">
			<div class="flex items-center justify-between gap-2">
				<h2 class="section-title flex items-center gap-2">
					<span class="tile h-8 w-8 bg-ctp-blue/15 text-ctp-blue" aria-hidden="true">
						<Wallet size={16} />
					</span>
					Anggaran {monthLabel}
				</h2>
				<span class="chip bg-ctp-green/15 font-semibold text-ctp-green">{budgetPct}% Terpakai</span>
			</div>
			<div
				class="mt-4 h-3 overflow-hidden rounded-full bg-ctp-crust"
				role="progressbar"
				aria-valuenow={budgetPct}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Persentase anggaran terpakai"
			>
				<div class="h-full rounded-full bg-ctp-blue" style="width: {budgetPct}%"></div>
			</div>
			<p class="mt-2 text-sm text-ctp-subtext0">
				Pengeluaran {formatIDR(sumByType.expense)} dari pemasukan {formatIDR(sumByType.income)}
			</p>
		</div>
	</section>

	<!-- Category grid: 2-col tinted cards -->
	{#if data.categoryTotals.length > 0}
		<section aria-label="Kategori" class="mb-6">
			<h2 class="section-title mb-2">Kategori</h2>
			<ul class="grid grid-cols-2 gap-3">
				{#each data.categoryTotals as c (c.category + c.type)}
					{@const typeTotal = c.type === 'income' ? sumByType.income : sumByType.expense}
					{@const share = typeTotal > 0 ? Math.round((c.total / typeTotal) * 100) : 0}
					<li class="card p-4">
						<div class="flex items-start justify-between gap-2">
							<span
								class="tile h-10 w-10 {c.type === 'income'
									? 'bg-ctp-green/15 text-ctp-green'
									: 'bg-ctp-red/15 text-ctp-red'}"
								aria-hidden="true"
							>
								{#if c.type === 'income'}
									<TrendingUp size={18} />
								{:else}
									<TrendingDown size={18} />
								{/if}
							</span>
							<span class="chip">{share}%</span>
						</div>
						<p class="mt-3 truncate text-sm text-ctp-subtext0">{c.category}</p>
						<p class="num text-sm font-bold tabular-nums text-ctp-text">{formatIDR(c.total)}</p>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Income vs expense per category (grouped horizontal bars) -->
		<section aria-label="Perbandingan per kategori" class="mb-6">
			<div class="card p-5">
				<h2 class="section-title mb-4">Per Kategori</h2>
				<div
					class="mt-1"
					style="height: {categoryChartHeight}px"
					role="img"
					aria-label="Perbandingan pemasukan dan pengeluaran per kategori"
				>
					<div class="mb-2 flex justify-center gap-4 text-xs text-ctp-subtext0" aria-hidden="true">
						<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-ctp-green"></span> Pemasukan</span>
						<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-ctp-red"></span> Pengeluaran</span>
					</div>
					<BarChart
						orientation="horizontal"
						data={categoryChart}
						y="category"
						series={trendSeries}
						seriesLayout="group"
						height={categoryChartHeight}
						xDomain={[0, null]}
						motion={reduceMotion ? 'none' : undefined}
						props={{
							yAxis: { format: (v: unknown) => shortLabel(v) },
							xAxis: { format: (v: unknown) => compactIDR(v) },
							tooltip: {
								root: { motion: reduceMotion ? 'none' : 'spring' },
								item: { format: (v: unknown) => formatIDR(Number(v) || 0) },
								hideTotal: true
							}
						}}
					/>
				</div>
			</div>
		</section>
	{/if}

	<!-- Wallet spend breakdown (horizontal bars, per-wallet hues) -->
	<section aria-label="Pengeluaran per dompet" class="mb-6">
		<div class="card p-5">
			<h2 class="section-title mb-4">Pengeluaran per Dompet</h2>
			{#if data.walletTotals.length === 0 || data.walletTotals.every((w) => w.total === 0)}
				<p class="py-6 text-center text-sm text-ctp-subtext0">
					Belum ada pengeluaran bulan ini.
				</p>
			{:else}
				<div
					style="height: {walletChartHeight}px"
					role="img"
					aria-label="Pengeluaran per dompet"
				>
					<BarChart
						orientation="horizontal"
						data={walletChart}
						x="total"
						y="name"
						c="name"
						cRange={CHART_PALETTE}
						series={[{ key: 'total', label: 'Pengeluaran' }]}
						height={walletChartHeight}
						xDomain={[0, null]}
						motion={reduceMotion ? 'none' : undefined}
						props={{
							yAxis: { format: (v: unknown) => shortLabel(v) },
							xAxis: { format: (v: unknown) => compactIDR(v) },
							tooltip: {
								root: { motion: reduceMotion ? 'none' : 'spring' },
								item: { format: (v: unknown) => formatIDR(Number(v) || 0) }
							}
						}}
					/>
				</div>
				<ul class="mt-5 space-y-3">
					{#each data.walletTotals as w, i (w.id)}
						<li>
							<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
								<span class="flex min-w-0 items-center gap-2 font-medium text-ctp-text">
									<span
										class="h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {CHART_PALETTE[i % CHART_PALETTE.length]}"
										aria-hidden="true"
									></span>
									<span class="truncate">{w.name}</span>
								</span>
								<span class="num ml-auto font-semibold tabular-nums text-ctp-text">
									{formatIDR(w.total)}
								</span>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<!-- 6-month trend (vertical bars, income + expense side by side) -->
	<section aria-label="Tren 6 bulan terakhir">
		<div class="card p-5">
			<h2 class="section-title mb-4">Tren 6 Bulan</h2>
			<div
				class="h-60"
				role="img"
				aria-label="Grafik batang tren pemasukan dan pengeluaran enam bulan terakhir"
			>
				<BarChart
					data={data.monthlyTotals}
					x="month"
					series={trendSeries}
					seriesLayout="group"
					height={240}
					yDomain={hasMonthly ? [0, null] : [0, 1]}
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
			<div class="mt-3 flex justify-center gap-4 text-xs text-ctp-subtext0">
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-ctp-green"></span> Pemasukan</span>
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-ctp-red"></span> Pengeluaran</span>
			</div>
		</div>
	</section>
</main>
