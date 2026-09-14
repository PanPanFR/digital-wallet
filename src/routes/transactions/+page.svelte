<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Plus, Pencil, Trash2, ReceiptText, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from '@lucide/svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import WalletSelect from '$lib/components/WalletSelect.svelte';
	import { notify } from '$lib/stores.svelte';
	import { formatIDR, formatDate } from '$lib/format';
	import { CATEGORIES } from '$lib/constants';
	import type { TxRow, WalletRow } from '$lib/server/db';

	let { data } = $props();

	let showForm = $state(false);
	let editing = $state<TxRow | null>(null);
	let deleteTarget = $state<TxRow | null>(null);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = null;

	let selected = $state(new Set<string>());
	let selectAllEl = $state<HTMLInputElement | null>(null);
	let showBulkConfirm = $state(false);
	let bulkDeleting = $state(false);
	let bulkForm: HTMLFormElement | null = null;

	// Client-side Pemasukan/Pengeluaran filter (server API untouched).
	let typeFilter = $state<'all' | 'income' | 'expense'>('all');
	const visible = $derived(
		typeFilter === 'all'
			? data.transactions
			: data.transactions.filter((t) => t.type === typeFilter)
	);

	const monthIncome = $derived(
		data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
	);
	const monthExpense = $derived(
		data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
	);

	// Mini day-bars: per-day income+expense volume, last 14 days, peak highlighted.
	const dayTotals = $derived((() => {
		const map = new Map<string, number>();
		for (const t of data.transactions) {
			if (t.type === 'transfer') continue;
			const day = t.date.slice(0, 10);
			map.set(day, (map.get(day) ?? 0) + t.amount);
		}
		const days = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-14);
		const peak = days.reduce((m, [, v]) => Math.max(m, v), 0);
		return { days, peak };
	})());

	// Opened by the mobile nav Catat FAB via window event (no shared state).
	$effect(() => {
		const open = () => {
			editing = null;
			showForm = true;
		};
		window.addEventListener('open-transaction-form', open);
		return () => window.removeEventListener('open-transaction-form', open);
	});

	const selectedCount = $derived(selected.size);
	const allSelected = $derived(
		visible.length > 0 && selectedCount === visible.length
	);
	const indeterminate = $derived(selectedCount > 0 && !allSelected);

	$effect(() => {
		if (selectAllEl) selectAllEl.indeterminate = indeterminate;
	});

	// ponytail: clear selection whenever page data or type filter changes
	// so stale ids from another view can never reach bulkDelete
	$effect(() => {
		void data.transactions;
		void typeFilter;
		selected = new Set();
	});

	function toggleRow(id: string, checked: boolean) {
		const next = new Set(selected);
		if (checked) next.add(id);
		else next.delete(id);
		selected = next;
	}

	function toggleAll(checked: boolean) {
		selected = checked ? new Set(visible.map((t) => t.id)) : new Set();
	}

	const handleBulkDelete: SubmitFunction = () => {
		bulkDeleting = true;
		return async ({ result, update }) => {
			bulkDeleting = false;
			showBulkConfirm = false;
			await update();
			if (result.type === 'success') {
				selected = new Set();
				notify('success', 'Transaksi terpilih dihapus');
			} else if (result.type === 'failure' && result.data?.error) {
				notify('error', String(result.data.error));
			} else {
				notify('error', 'Gagal menghapus transaksi');
			}
		};
	};

	function openAdd() {
		editing = null;
		showForm = true;
	}

	function openEdit(tx: TxRow) {
		editing = tx;
		showForm = true;
	}

	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			deleting = false;
			deleteTarget = null;
			await update();
			if (result.type === 'success') notify('success', 'Transaksi dihapus');
			else notify('error', 'Gagal menghapus transaksi');
		};
	};

	function onMonthChange(e: Event) {
		(e.currentTarget as HTMLFormElement).requestSubmit();
	}

	function filterHref(wallet: string | null, offset = 0) {
		const p = new URLSearchParams();
		if (data.month) p.set('month', data.month);
		if (wallet) p.set('wallet', wallet);
		if (data.q) p.set('q', data.q);
		if (data.category) p.set('category', data.category);
		if (offset > 0) p.set('offset', String(offset));
		const q = p.toString();
		return q ? `/transactions?${q}` : '/transactions';
	}

	function isChipActive(wallet: string | null) {
		return wallet ? data.wallet === wallet : !data.wallet;
	}

	// ?wallet= holds a kind ('digital'|'cash') or a wallet id; select only preselects ids.
	const selectedWalletId = $derived(
		data.wallet && data.wallet !== 'digital' && data.wallet !== 'cash' ? data.wallet : ''
	);

	const monthLabel = $derived(
		data.month
			? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
					new Date(data.month + '-01')
				)
			: ''
	);
</script>

<svelte:head>
	<title>Transaksi · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
	<div class="page-header">
		<h1 class="page-title">Transaksi</h1>
		<button
			onclick={openAdd}
			class="btn btn-primary px-3 py-2"
		>
			<Plus size={16} /> Catat
		</button>
	</div>

	<div
		class="mb-3 flex gap-1 rounded-full bg-ctp-crust p-1"
		role="group"
		aria-label="Filter jenis transaksi"
	>
		<button
			type="button"
			onclick={() => (typeFilter = 'income')}
			aria-pressed={typeFilter === 'income'}
			class="flex-1 rounded-full px-3 py-1.5 text-sm transition-colors
				{typeFilter === 'income'
				? 'bg-[#2c2f47] font-semibold text-white'
				: 'bg-ctp-crust text-ctp-text hover:bg-ctp-surface0'}"
		>
			Pemasukan
		</button>
		<button
			type="button"
			onclick={() => (typeFilter = 'expense')}
			aria-pressed={typeFilter === 'expense'}
			class="flex-1 rounded-full px-3 py-1.5 text-sm transition-colors
				{typeFilter === 'expense'
				? 'bg-[#2c2f47] font-semibold text-white'
				: 'bg-ctp-crust text-ctp-text hover:bg-ctp-surface0'}"
		>
			Pengeluaran
		</button>
		<button
			type="button"
			onclick={() => (typeFilter = 'all')}
			aria-pressed={typeFilter === 'all'}
			class="flex-1 rounded-full px-3 py-1.5 text-sm transition-colors
				{typeFilter === 'all'
				? 'bg-[#2c2f47] font-semibold text-white'
				: 'bg-ctp-crust text-ctp-text hover:bg-ctp-surface0'}"
		>
			Semua
		</button>
	</div>

	<section class="card mb-3 p-4" aria-label="Total transaksi">
		<div class="section-header">
			<h2 class="section-title">Total{data.month ? ` ${monthLabel}` : ''}</h2>
		</div>
		<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
			<span class="num font-bold tabular-nums text-ctp-green">+ {formatIDR(monthIncome)}</span>
			<span class="num font-bold tabular-nums text-ctp-red">− {formatIDR(monthExpense)}</span>
			<span
				class="num ml-auto font-bold tabular-nums
				{monthIncome - monthExpense < 0 ? 'text-ctp-red' : 'text-ctp-text'}"
			>
				{monthIncome - monthExpense < 0 ? '−' : '+'} {formatIDR(Math.abs(monthIncome - monthExpense))}
			</span>
		</p>
	</section>

	<section class="card mb-3 p-4" aria-label="Aktivitas harian">
		<div class="section-header">
			<h2 class="section-title">Aktivitas Harian</h2>
			{#if dayTotals.peak > 0}
				<span class="chip">Puncak {formatIDR(dayTotals.peak)}</span>
			{/if}
		</div>
		{#if dayTotals.days.length === 0}
			<p class="py-2 text-center text-sm text-ctp-subtext0">
				Belum ada data harian.
			</p>
		{:else}
			<div
				class="flex h-16 items-end gap-1"
				role="img"
				aria-label="Grafik batang aktivitas harian, puncak {formatIDR(dayTotals.peak)}"
			>
				{#each dayTotals.days as [day, total] (day)}
					<div
						title="{formatDate(day)} · {formatIDR(total)}"
						style="height: {dayTotals.peak > 0 ? Math.max(8, Math.round((total / dayTotals.peak) * 100)) : 0}%"
						class="flex-1 rounded-sm
							{total === dayTotals.peak ? 'bg-ctp-peach' : 'bg-ctp-surface1'}"
					></div>
				{/each}
			</div>
		{/if}
	</section>

	<div class="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter jenis dompet">
		<a
			href={filterHref(null)}
			aria-current={isChipActive(null) ? 'true' : undefined}
			class="{isChipActive(null) ? 'chip-active' : 'chip'} px-3 py-1"
		>
			Semua
		</a>
		<a
			href={filterHref('digital')}
			aria-current={isChipActive('digital') ? 'true' : undefined}
			class="{isChipActive('digital') ? 'chip-active' : 'chip'} px-3 py-1"
		>
			Digital
		</a>
		<a
			href={filterHref('cash')}
			aria-current={isChipActive('cash') ? 'true' : undefined}
			class="{isChipActive('cash') ? 'chip-active' : 'chip'} px-3 py-1"
		>
			Tunai
		</a>
	</div>

	<form method="GET" action="/transactions" class="mb-4 flex flex-wrap items-center gap-2">
		<label for="month" class="text-sm text-ctp-subtext1">Bulan</label>
		<input
			id="month"
			name="month"
			type="month"
			value={data.month ?? ''}
			onchange={onMonthChange}
			class="input w-auto"
		/>
		<label for="wallet-filter" class="text-sm text-ctp-subtext1">Dompet</label>
		<WalletSelect
			id="wallet-filter"
			name="wallet"
			value={selectedWalletId}
			placeholder="Semua dompet"
			placeholderDisabled={false}
			className="w-auto"
			wallets={data.wallets}
		/>
		<input
			type="search"
			name="q"
			placeholder="Cari deskripsi…"
			value={data.q}
			aria-label="Cari deskripsi"
			class="input w-auto"
		/>
		<select
			name="category"
			aria-label="Kategori"
			value={data.category}
			class="input w-auto"
		>
			<option value="">Semua kategori</option>
			{#each CATEGORIES as c (c)}
				<option value={c}>{c}</option>
			{/each}
		</select>
		<button
			type="submit"
			class="btn btn-outline px-3 py-1.5"
		>
			Terapkan
		</button>
		{#if data.month || data.wallet || data.q || data.category}
			<a href="/transactions" class="text-sm text-ctp-peach hover:underline">
				Reset
			</a>
		{/if}
	</form>

	{#if data.transactions.length === 0}
		<div class="card py-12 text-center">
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-surface0 text-ctp-subtext0"
				aria-hidden="true"
			>
				<ReceiptText size={22} />
			</div>
			<p class="text-sm font-medium text-ctp-text">
				Belum ada transaksi{data.month ? ` untuk ${monthLabel}` : ''}
			</p>
			<p class="mt-1 text-xs text-ctp-subtext0">
				Catat transaksi pertama dengan tombol "Catat" di atas.
			</p>
		</div>
	{:else}
		<div class="mb-2 flex items-center gap-3">
			<label class="flex items-center gap-2 text-sm text-ctp-subtext1">
				<input
					type="checkbox"
					checked={allSelected}
					onchange={(e) => toggleAll(e.currentTarget.checked)}
					aria-label="Pilih semua transaksi di halaman ini"
					class="h-4 w-4 rounded border-ctp-surface1 accent-ctp-peach"
				/>
				Pilih semua
			</label>
			{#if selectedCount > 0}
				<button
					onclick={() => (showBulkConfirm = true)}
					class="btn btn-danger ml-auto px-3 py-1.5"
				>
					Hapus ({selectedCount})
				</button>
			{/if}
		</div>
		{#if selectedCount > 0}
			<p class="mb-2 text-xs text-ctp-subtext0">
				Menghapus yang terpilih di halaman ini saja.
			</p>
		{/if}
		{#if visible.length === 0}
			<p class="card mt-2 px-4 py-8 text-center text-sm text-ctp-subtext0">
				Tidak ada transaksi {typeFilter === 'income' ? 'pemasukan' : 'pengeluaran'} pada
				tampilan ini.
			</p>
		{:else}
		<ul class="list">
			{#each visible as tx (tx.id)}
				<li class="list-row {selected.has(tx.id) ? 'bg-ctp-peach/10' : ''}">
					<input
						type="checkbox"
						checked={selected.has(tx.id)}
						onchange={(e) => toggleRow(tx.id, e.currentTarget.checked)}
						aria-label="Pilih transaksi {tx.description}"
						class="h-4 w-4 shrink-0 rounded border-ctp-surface1 accent-ctp-peach"
					/>
					<span
						class="tile h-8 w-8
						{tx.type === 'income'
							? 'bg-ctp-green/15 text-ctp-green'
							: tx.type === 'expense'
								? 'bg-ctp-red/15 text-ctp-red'
								: 'bg-ctp-blue/15 text-ctp-blue'}"
						aria-hidden="true"
					>
						{#if tx.type === 'income'}
							<ArrowDownLeft size={16} />
						{:else if tx.type === 'expense'}
							<ArrowUpRight size={16} />
						{:else}
							<ArrowLeftRight size={16} />
						{/if}
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-ctp-text">{tx.description}</p>
					<p class="text-xs text-ctp-subtext0">
						{tx.category} · {formatDate(tx.date)}
					</p>
				</div>
				{#if tx.type === 'transfer' && tx.dest_wallet_name}
					<span class="chip">
						→ {tx.dest_wallet_name}
					</span>
				{/if}
				<span class="chip">
					{tx.wallet_name}
				</span>
					<span
						class="num tabular-nums text-sm font-semibold whitespace-nowrap
						{tx.type === 'transfer'
							? 'text-ctp-blue'
							: tx.type === 'income'
								? 'text-ctp-green'
								: 'text-ctp-red'}"
					>
						{tx.type === 'income' ? '+' : '−'} {formatIDR(tx.amount)}
					</span>
					<div class="flex gap-1">
						<button
							onclick={() => openEdit(tx)}
							aria-label="Edit {tx.description}"
							class="btn btn-ghost rounded-lg p-1.5"
						>
							<Pencil size={15} />
						</button>
						<button
							onclick={() => (deleteTarget = tx)}
							aria-label="Hapus {tx.description}"
							class="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red"
						>
							<Trash2 size={15} />
						</button>
					</div>
				</li>
			{/each}
		</ul>
		{/if}
		{#if data.hasMore}
			<div class="mt-3 text-center">
				<a
					href={filterHref(data.wallet ?? null, data.offset + 50)}
					class="btn btn-outline px-4 py-2"
				>
					Muat lebih
				</a>
			</div>
		{/if}
	{/if}
</main>

<TransactionForm transaction={editing} wallets={data.wallets} open={showForm} onclose={() => (showForm = false)} />

<ConfirmModal
	open={!!deleteTarget}
	title="Hapus Transaksi"
	message={deleteTarget
		? `Hapus "${deleteTarget.description}" (${formatIDR(deleteTarget.amount)})? Tindakan ini tidak bisa dibatalkan.`
		: ''}
	confirmText={deleting ? 'Menghapus…' : 'Hapus'}
	onConfirm={() => deleteForm?.requestSubmit()}
	onCancel={() => (deleteTarget = null)}
/>

<form method="POST" action="?/delete" bind:this={deleteForm} use:enhance={handleDelete} class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<ConfirmModal
	open={showBulkConfirm}
	title="Hapus Transaksi"
	message={`Hapus ${selectedCount} transaksi terpilih? Tindakan ini tidak bisa dibatalkan.`}
	confirmText={bulkDeleting ? 'Menghapus…' : 'Hapus'}
	onConfirm={() => bulkForm?.requestSubmit()}
	onCancel={() => (showBulkConfirm = false)}
/>

<form method="POST" action="?/bulkDelete" bind:this={bulkForm} use:enhance={handleBulkDelete} class="hidden">
	<input type="hidden" name="ids" value={[...selected].join(',')} />
</form>
