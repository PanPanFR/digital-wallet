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
	import type { TxRow } from '$lib/server/db';

	let { data } = $props();

	let showForm = $state(false);
	let editing = $state<TxRow | null>(null);
	let deleteTarget = $state<TxRow | null>(null);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = null;

	const monthIncome = $derived(
		data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
	);
	const monthExpense = $derived(
		data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
	);

	// Opened by the mobile nav Catat FAB via window event (no shared state).
	$effect(() => {
		const open = () => {
			editing = null;
			showForm = true;
		};
		window.addEventListener('open-transaction-form', open);
		return () => window.removeEventListener('open-transaction-form', open);
	});

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

	<form method="GET" action="/transactions" class="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
		<label for="month" class="text-sm text-ctp-subtext1">Bulan</label>
		<input
			id="month"
			name="month"
			type="month"
			value={data.month ?? ''}
			onchange={onMonthChange}
			class="input w-full sm:w-auto"
		/>
		<label for="wallet-filter" class="text-sm text-ctp-subtext1">Dompet</label>
		<WalletSelect
			id="wallet-filter"
			name="wallet"
			value={selectedWalletId}
			placeholder="Semua dompet"
			placeholderDisabled={false}
			className="w-full sm:w-auto"
			wallets={data.wallets}
		/>
		<input
			type="search"
			name="q"
			placeholder="Cari deskripsi…"
			value={data.q}
			aria-label="Cari deskripsi"
			class="input w-full sm:w-auto"
		/>
		<select
			name="category"
			aria-label="Kategori"
			value={data.category}
			class="input w-full sm:w-auto"
		>
			<option value="">Semua kategori</option>
			{#each CATEGORIES as c (c)}
				<option value={c}>{c}</option>
			{/each}
		</select>
		<button
			type="submit"
			class="btn btn-outline col-span-2 px-3 py-2 sm:col-span-1 sm:py-1.5"
		>
			Terapkan
		</button>
		{#if data.month || data.wallet || data.q || data.category}
			<a href="/transactions" class="col-span-2 text-sm text-ctp-peach hover:underline sm:col-span-1">
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
		<ul class="list">
			{#each data.transactions as tx (tx.id)}
				<li class="list-row min-w-0">
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
					<span class="chip max-sm:sr-only">
						→ {tx.dest_wallet_name}
					</span>
				{/if}
				<span class="chip max-sm:sr-only">
					{tx.wallet_name}
				</span>
					<span
						class="num text-[13px] font-semibold whitespace-nowrap tabular-nums sm:text-sm
						{tx.type === 'transfer'
							? 'text-ctp-blue'
							: tx.type === 'income'
								? 'text-ctp-green'
								: 'text-ctp-red'}"
					>
						{tx.type === 'income' ? '+' : '−'} {formatIDR(tx.amount)}
					</span>
					<div class="flex shrink-0 gap-0.5 sm:gap-1">
						<button
							onclick={() => openEdit(tx)}
							aria-label="Edit {tx.description}"
							class="btn btn-ghost min-h-[40px] min-w-[40px] rounded-lg p-2 sm:min-h-0 sm:min-w-0 sm:p-1.5"
						>
							<Pencil size={15} />
						</button>
						<button
							onclick={() => (deleteTarget = tx)}
							aria-label="Hapus {tx.description}"
							class="btn btn-ghost min-h-[40px] min-w-[40px] rounded-lg p-2 hover:text-ctp-red sm:min-h-0 sm:min-w-0 sm:p-1.5"
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
