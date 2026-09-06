<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { notify } from '$lib/stores.svelte';
	import { formatIDR, formatDate } from '$lib/format';
	import type { TxRow } from '$lib/server/db';

	let { data } = $props();

	let showForm = $state(false);
	let editing = $state<TxRow | null>(null);
	let deleteTarget = $state<TxRow | null>(null);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = null;

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
</script>

<svelte:head>
	<title>Transaksi · Finance Tracker</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="mb-4 flex items-center justify-between gap-3">
		<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Transaksi</h1>
		<button
			onclick={openAdd}
			class="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium"
		>
			<Plus size={16} /> Tambah
		</button>
	</div>

	<form method="GET" action="/transactions" class="mb-4 flex items-center gap-2">
		<label for="month" class="text-sm text-gray-600 dark:text-gray-400">Bulan</label>
		<input
			id="month"
			name="month"
			type="month"
			value={data.month ?? ''}
			onchange={onMonthChange}
			class="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 dark:text-white px-2.5 py-1.5 text-sm"
		/>
		{#if data.month}
			<a href="/transactions" class="text-sm text-sky-600 hover:underline dark:text-sky-400">
				Semua bulan
			</a>
		{/if}
	</form>

	{#if data.transactions.length === 0}
		<p
			class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
		>
			Belum ada transaksi{data.month ? ` untuk ${data.month}` : ''}.
		</p>
	{:else}
		<ul
			class="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
		>
			{#each data.transactions as tx (tx.id)}
				<li class="flex items-center gap-3 px-4 py-3">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-gray-900 dark:text-white">{tx.description}</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{tx.category} · {formatDate(tx.created_at)}
						</p>
					</div>
					<span
						class="font-mono text-sm font-bold whitespace-nowrap
						{tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}"
					>
						{tx.type === 'income' ? '+' : '−'}{formatIDR(tx.amount)}
					</span>
					<div class="flex gap-1">
						<button
							onclick={() => openEdit(tx)}
							aria-label="Edit {tx.description}"
							class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600 dark:hover:bg-gray-800"
						>
							<Pencil size={15} />
						</button>
						<button
							onclick={() => (deleteTarget = tx)}
							aria-label="Hapus {tx.description}"
							class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
						>
							<Trash2 size={15} />
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<TransactionForm transaction={editing} open={showForm} onclose={() => (showForm = false)} />

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
