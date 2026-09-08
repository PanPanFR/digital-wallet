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
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Analitik</h1>
			<p class="text-xs text-gray-500 dark:text-gray-400">{monthLabel}</p>
		</div>
		<form method="GET" action="/analytics" class="flex items-center gap-2">
			<label for="month" class="text-sm text-gray-600 dark:text-gray-400">Bulan</label>
			<input
				id="month"
				name="month"
				type="month"
				value={data.month}
				onchange={onMonthChange}
				class="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
			/>
		</form>
	</div>

	<!-- Category breakdown (horizontal bars) -->
	<section aria-label="Pengeluaran per kategori" class="mb-8">
		<h2 class="mb-3 font-semibold text-gray-900 dark:text-white">Per Kategori</h2>
		{#if data.categoryTotals.length === 0}
			<p
				class="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
			>
				Tidak ada data untuk {monthLabel}.
			</p>
		{:else}
			<ul class="space-y-3">
				{#each data.categoryTotals as cat (cat.category + cat.type)}
					{@const pct = Math.round((cat.total / (sumByType[cat.type] || 1)) * 100)}
					<li>
						<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
							<span class="font-medium text-gray-900 dark:text-white">{cat.category}</span>
							<span class="text-gray-500 dark:text-gray-400">{pct}%</span>
							<span
								class="ml-auto font-mono font-bold
								{cat.type === 'income'
									? 'text-emerald-600 dark:text-emerald-400'
									: 'text-gray-900 dark:text-white'}"
							>
								{formatIDR(cat.total)}
							</span>
						</div>
						<div
							class="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
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
	</section>

	<!-- Wallet spend breakdown (horizontal bars, neutral color) -->
	<section aria-label="Pengeluaran per dompet" class="mb-8">
		<h2 class="mb-3 font-semibold text-gray-900 dark:text-white">Pengeluaran per Dompet</h2>
		{#if data.walletTotals.length === 0 || data.walletTotals.every((w) => w.total === 0)}
			<p
				class="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
			>
				Belum ada pengeluaran bulan ini.
			</p>
		{:else}
			<ul class="space-y-3">
				{#each data.walletTotals as w (w.id)}
					{@const pct = Math.round((w.total / maxWallet) * 100)}
					<li>
						<div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
							<span class="font-medium text-gray-900 dark:text-white">{w.name}</span>
							<span class="ml-auto font-mono font-bold text-gray-900 dark:text-white">
								{formatIDR(w.total)}
							</span>
						</div>
						<div
							class="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
							role="progressbar"
							aria-valuenow={pct}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="{w.name}: {pct}%"
						>
							<div class="h-full rounded-full bg-gray-400 dark:bg-gray-500" style="width: {pct}%"></div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- 6-month trend (vertical bars, income + expense side by side) -->
	<section aria-label="Tren 6 bulan terakhir">
		<h2 class="mb-3 font-semibold text-gray-900 dark:text-white">Tren 6 Bulan</h2>
		<div class="flex items-end justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
			{#each data.monthlyTotals as m (m.month)}
				<div class="flex flex-1 flex-col items-center gap-1.5">
					<div class="flex h-32 w-full items-end justify-center gap-1" aria-hidden="true">
						<div
							class="w-3 rounded-t bg-emerald-500"
							style="height: {Math.max((m.income / maxMonthly) * 100, 2)}%"
							title="Pemasukan {formatIDR(m.income)}"
						></div>
						<div
							class="w-3 rounded-t bg-red-500"
							style="height: {Math.max((m.expense / maxMonthly) * 100, 2)}%"
							title="Pengeluaran {formatIDR(m.expense)}"
						></div>
					</div>
					<span class="text-xs text-gray-500 dark:text-gray-400">{monthShort(m.month)}</span>
				</div>
			{/each}
		</div>
		<div class="mt-2 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
			<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-emerald-500"></span> Pemasukan</span>
			<span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-red-500"></span> Pengeluaran</span>
		</div>
	</section>
</main>
