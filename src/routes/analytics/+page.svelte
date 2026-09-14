<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { BarChart, PieChart } from 'layerchart/svg';
	import { formatIDR } from '$lib/format';

	let { data } = $props();

	// Horizontal bars: category totals for the selected month, as share of total expense / income.
	const sumByType = $derived({
		expense: data.categoryTotals.filter((c) => c.type === 'expense').reduce((s, c) => s + c.total, 0),
		income: data.categoryTotals.filter((c) => c.type === 'income').reduce((s, c) => s + c.total, 0)
	});
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

<main class="mx-auto max-w-3xl px-4 py-6">
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

	<!-- Category breakdown (donut + horizontal bars) -->
	<section aria-label="Pengeluaran per kategori" class="mb-6">
		<div class="card p-5">
			<h2 class="section-title mb-4">Per Kategori</h2>
			{#if data.categoryTotals.length === 0}
				<p class="py-6 text-center text-sm text-ctp-subtext0">
					Tidak ada data untuk {monthLabel}.
				</p>
			{:else}
				{#if sumByType.expense > 0}
					{@const expenseCats = data.categoryTotals.filter((c) => c.type === 'expense')}
			<!-- ponytail: fixed 3-color warm Catppuccin palette cycles if >3 categories -->
			{@const palette = [
				'var(--color-ctp-red)',
				'var(--color-ctp-peach)',
				'var(--color-ctp-maroon)'
			]}
					<div class="flex flex-col items-center gap-5 sm:flex-row">
						<div
							class="h-40 w-40 shrink-0"
							role="img"
							aria-label="Proporsi pengeluaran per kategori"
						>
							<PieChart
								data={expenseCats}
								key="category"
								label="category"
								value="total"
								c="category"
								cRange={palette}
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
						<ul class="w-full space-y-1.5 text-sm" aria-label="Legenda proporsi pengeluaran">
							{#each expenseCats as cat, i (cat.category)}
								{@const pct = Math.round((cat.total / sumByType.expense) * 100)}
								<li class="flex items-center gap-2">
									<span
										class="h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {palette[i % palette.length]}"
										aria-hidden="true"
									></span>
									<span class="truncate text-ctp-text">{cat.category}</span>
									<span class="num ml-auto shrink-0 tabular-nums text-ctp-subtext0">{pct}%</span>
									<span class="num shrink-0 font-semibold tabular-nums text-ctp-text">
										{formatIDR(cat.total)}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<div
					class="mt-5"
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
			{/if}
		</div>
	</section>

	<!-- Wallet spend breakdown (horizontal bars, neutral color) -->
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
						series={[{ key: 'total', label: 'Pengeluaran', color: 'var(--color-ctp-overlay0)' }]}
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
					{#each data.walletTotals as w (w.id)}
						<li>
							<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
								<span class="font-medium text-ctp-text">{w.name}</span>
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
