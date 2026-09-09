<script lang="ts">
	import { formatIDR } from '$lib/format';

	let { data } = $props();

	// Horizontal bars: category totals for the selected month, as share of total expense / income.
	const sumByType = $derived({
		expense: data.categoryTotals.filter((c) => c.type === 'expense').reduce((s, c) => s + c.total, 0),
		income: data.categoryTotals.filter((c) => c.type === 'income').reduce((s, c) => s + c.total, 0)
	});
	// Wallet spend bars: width proportional to the largest wallet total.
	const maxWallet = $derived(Math.max(...data.walletTotals.map((w) => w.total), 1));
	// Vertical bars: 6-month trend, income + expense side by side.
	const maxMonthly = $derived(
		Math.max(...data.monthlyTotals.map((m) => Math.max(m.income, m.expense)), 1)
	);
	const monthLabel = $derived(
		new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
			new Date(`${data.month}-01T00:00:00`)
		)
	);

	function monthShort(ym: string) {
		return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(`${ym}-01T00:00:00`));
	}

	function onMonthChange(e: Event) {
		(e.currentTarget as HTMLFormElement).requestSubmit();
	}
</script>

<svelte:head>
	<title>Analitik · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold text-slate-900 dark:text-white">Analitik</h1>
			<p class="text-xs text-slate-500 dark:text-slate-400">{monthLabel}</p>
		</div>
		<form method="GET" action="/analytics" class="flex items-center gap-2">
			<label for="month" class="text-sm text-slate-600 dark:text-slate-400">Bulan</label>
			<input id="month" name="month" type="month" value={data.month} onchange={onMonthChange} class="input w-auto px-2.5 py-1.5" />
		</form>
	</div>

	<!-- Category breakdown (donut + horizontal bars) -->
	<section aria-label="Pengeluaran per kategori" class="mb-6">
		<div class="card p-5">
			<h2 class="mb-4 font-semibold text-slate-900 dark:text-white">Per Kategori</h2>
			{#if data.categoryTotals.length === 0}
				<p class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
					Tidak ada data untuk {monthLabel}.
				</p>
			{:else}
				{#if sumByType.expense > 0}
					{@const expenseCats = data.categoryTotals.filter((c) => c.type === 'expense')}
					<!-- ponytail: fixed 6-color muted palette cycles if >6 categories -->
					{@const palette = [
						'var(--color-sky-500)',
						'var(--color-amber-500)',
						'var(--color-emerald-500)',
						'var(--color-red-500)',
						'var(--color-violet-500)',
						'var(--color-slate-500)'
					]}
					<div class="flex flex-col items-center gap-5 sm:flex-row">
						<svg
							viewBox="0 0 42 42"
							class="h-36 w-36 shrink-0 -rotate-90"
							role="img"
							aria-label="Proporsi pengeluaran per kategori"
						>
							<title>Proporsi pengeluaran per kategori</title>
							<circle
								cx="21"
								cy="21"
								r="15.9155"
								fill="none"
								stroke-width="6"
								class="stroke-slate-100 dark:stroke-slate-800"
							></circle>
							{#each expenseCats as cat, i (cat.category)}
								{@const frac = cat.total / sumByType.expense}
								{@const cum = expenseCats.slice(0, i).reduce((s, c) => s + c.total, 0) / sumByType.expense}
								<circle
									cx="21"
									cy="21"
									r="15.9155"
									fill="none"
									stroke-width="6"
									stroke={palette[i % palette.length]}
									stroke-dasharray="{frac * 100} {100 - frac * 100}"
									stroke-dashoffset={-cum * 100}
									pathLength="100"
									class="transition-[stroke-dasharray] duration-300"
								></circle>
							{/each}
						</svg>
						<ul class="w-full space-y-1.5 text-sm" aria-label="Legenda proporsi pengeluaran">
							{#each expenseCats as cat, i (cat.category)}
								{@const pct = Math.round((cat.total / sumByType.expense) * 100)}
								<li class="flex items-center gap-2">
									<span
										class="h-2.5 w-2.5 shrink-0 rounded-full"
										style="background-color: {palette[i % palette.length]}"
										aria-hidden="true"
									></span>
									<span class="truncate text-slate-700 dark:text-slate-300">{cat.category}</span>
									<span class="ml-auto shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{pct}%</span>
									<span class="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-white">
										{formatIDR(cat.total)}
									</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<ul class="mt-5 space-y-3">
					{#each data.categoryTotals as cat (cat.category + cat.type)}
						{@const pct = Math.round((cat.total / (sumByType[cat.type] || 1)) * 100)}
						<li>
							<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
								<span class="font-medium text-slate-900 dark:text-white">{cat.category}</span>
								<span class="tabular-nums text-slate-500 dark:text-slate-400">{pct}%</span>
								<span
									class="ml-auto font-semibold tabular-nums
									{cat.type === 'income'
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-slate-900 dark:text-white'}"
								>
									{formatIDR(cat.total)}
								</span>
							</div>
							<div
								class="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
								role="progressbar"
								aria-valuenow={pct}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label="{cat.category}: {pct}%"
							>
								<div
									class="h-full rounded-full
									{cat.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}"
									style="width: {pct}%"
								></div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</section>

	<!-- Wallet spend breakdown (horizontal bars, neutral color) -->
	<section aria-label="Pengeluaran per dompet" class="mb-6">
		<div class="card p-5">
			<h2 class="mb-4 font-semibold text-slate-900 dark:text-white">Pengeluaran per Dompet</h2>
			{#if data.walletTotals.length === 0 || data.walletTotals.every((w) => w.total === 0)}
				<p class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
					Belum ada pengeluaran bulan ini.
				</p>
			{:else}
				<ul class="space-y-3">
					{#each data.walletTotals as w (w.id)}
						{@const pct = Math.round((w.total / maxWallet) * 100)}
						<li>
							<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
								<span class="font-medium text-slate-900 dark:text-white">{w.name}</span>
								<span class="ml-auto font-semibold tabular-nums text-slate-900 dark:text-white">
									{formatIDR(w.total)}
								</span>
							</div>
							<div
								class="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
								role="progressbar"
								aria-valuenow={pct}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label="{w.name}: {pct}%"
							>
								<div class="h-full rounded-full bg-slate-400 dark:bg-slate-500" style="width: {pct}%"></div>
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
			<h2 class="mb-4 font-semibold text-slate-900 dark:text-white">Tren 6 Bulan</h2>
			<div class="flex items-end justify-between gap-3">
				{#each data.monthlyTotals as m (m.month)}
					<div class="flex flex-1 flex-col items-center gap-1.5">
						<div class="flex h-32 w-full items-end justify-center gap-1" aria-hidden="true">
							<div
								class="w-3 rounded-t-md bg-emerald-500"
								style="height: {Math.max((m.income / maxMonthly) * 100, 2)}%"
								title="Pemasukan {formatIDR(m.income)}"
							></div>
							<div
								class="w-3 rounded-t-md bg-red-500"
								style="height: {Math.max((m.expense / maxMonthly) * 100, 2)}%"
								title="Pengeluaran {formatIDR(m.expense)}"
							></div>
						</div>
						<span class="text-xs text-slate-500 dark:text-slate-400">{monthShort(m.month)}</span>
					</div>
				{/each}
			</div>
			<div class="mt-3 flex justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span> Pemasukan</span>
				<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-red-500"></span> Pengeluaran</span>
			</div>
		</div>
	</section>
</main>
