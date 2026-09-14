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

	const selectedCount = $derived(selected.size);
	const allSelected = $derived(
		data.transactions.length > 0 && selectedCount === data.transactions.length
	);
	const indeterminate = $derived(selectedCount > 0 && !allSelected);

	$effect(() => {
		if (selectAllEl) selectAllEl.indeterminate = indeterminate;
	});

	// ponytail: clear selection whenever page data changes (filter/pagination/delete)
	// so stale ids from another view can never reach bulkDelete
	$effect(() => {
		void data.transactions;
		selected = new Set();
	});

	function toggleRow(id: string, checked: boolean) {
		const next = new Set(selected);
		if (checked) next.add(id);
		else next.delete(id);
		selected = next;
	}

	function toggleAll(checked: boolean) {
		selected = checked ? new Set(data.transactions.map((t) => t.id)) : new Set();
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

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="page-header">
		<h1 class="page-title">Transaksi</h1>
		<button
			onclick={openAdd}
			class="btn btn-primary px-3 py-2"
		>
			<Plus size={16} /> Catat
		</button>
	</div>

	<div class="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter jenis dompet">
		<a
			href={filterHref(null)}
			aria-current={isChipActive(null) ? 'true' : undefined}
			class="chip px-3 py-1 transition-colors
				{isChipActive(null)
				? 'bg-ctp-peach/25 font-semibold text-ctp-peach ring-1 ring-inset ring-ctp-peach'
				: 'bg-ctp-surface0/60 text-ctp-subtext1 hover:bg-ctp-surface0'}"
		>
			Semua
		</a>
		<a
			href={filterHref('digital')}
			aria-current={isChipActive('digital') ? 'true' : undefined}
			class="chip px-3 py-1 transition-colors
				{isChipActive('digital')
				? 'bg-ctp-peach/25 font-semibold text-ctp-peach ring-1 ring-inset ring-ctp-peach'
				: 'bg-ctp-surface0/60 text-ctp-subtext1 hover:bg-ctp-surface0'}"
		>
			Digital
		</a>
		<a
			href={filterHref('cash')}
			aria-current={isChipActive('cash') ? 'true' : undefined}
			class="chip px-3 py-1 transition-colors
				{isChipActive('cash')
				? 'bg-ctp-peach/25 font-semibold text-ctp-peach ring-1 ring-inset ring-ctp-peach'
				: 'bg-ctp-surface0/60 text-ctp-subtext1 hover:bg-ctp-surface0'}"
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
		<ul class="list">
			{#each data.transactions as tx (tx.id)}
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
								: 'bg-ctp-surface0 text-ctp-subtext0'}"
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
					<span
						class="chip bg-ctp-surface0/60 text-ctp-subtext1"
					>
						→ {tx.dest_wallet_name}
					</span>
				{/if}
				<span class="chip bg-ctp-surface0/60 text-ctp-subtext1">
					{tx.wallet_name}
				</span>
					<span
						class="num tabular-nums text-sm font-semibold whitespace-nowrap
						{tx.type === 'transfer'
							? 'text-ctp-subtext1'
							: tx.type === 'income'
								? 'text-ctp-green'
								: 'text-ctp-red'}"
					>
						{tx.type === 'income' ? '+' : '−'}{formatIDR(tx.amount)}
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
