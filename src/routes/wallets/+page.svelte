<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Pencil, Trash2, Smartphone, Banknote } from '@lucide/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { notify } from '$lib/stores.svelte';
	import { formatIDR } from '$lib/format';
	import type { WalletWithBalance } from '$lib/server/db';

	let { data } = $props();

	const PRESETS: { name: string; kind: 'digital' | 'cash' }[] = [
		{ name: 'GoPay', kind: 'digital' },
		{ name: 'OVO', kind: 'digital' },
		{ name: 'DANA', kind: 'digital' },
		{ name: 'ShopeePay', kind: 'digital' },
		{ name: 'Tunai', kind: 'cash' }
	];

	let name = $state('');
	let kind = $state<'digital' | 'cash'>('digital');
	let errors = $state<Record<string, string>>({});

	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editKind = $state<'digital' | 'cash'>('digital');
	let editErrors = $state<Record<string, string>>({});

	let deleteTarget = $state<WalletWithBalance | null>(null);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = null;
	let listError = $state('');

	const wallets = $derived(data.wallets as WalletWithBalance[]);
	const digital = $derived(wallets.filter((w) => w.kind === 'digital'));
	const cash = $derived(wallets.filter((w) => w.kind === 'cash'));

	function applyPreset(p: { name: string; kind: 'digital' | 'cash' }) {
		name = p.name;
		kind = p.kind;
		errors = {};
	}

	function openEdit(w: WalletWithBalance) {
		editingId = w.id;
		editName = w.name;
		editKind = w.kind;
		editErrors = {};
		listError = '';
	}

	const handleCreate: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data) {
				errors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Dompet ditambahkan');
				name = '';
				kind = 'digital';
				errors = {};
			}
		};
	};

	const handleUpdate: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data) {
				editErrors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Dompet diperbarui');
				editingId = null;
			}
		};
	};

	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			deleting = false;
			deleteTarget = null;
			await update();
			if (result.type === 'success') {
				listError = '';
				notify('success', 'Dompet dihapus');
			} else if (result.type === 'failure' && result.data) {
				listError = (result.data as { error?: string }).error ?? 'Gagal menghapus dompet';
			} else {
				listError = 'Gagal menghapus dompet';
			}
		};
	};
</script>

<svelte:head>
	<title>Dompet · Digital Wallet</title>
</svelte:head>

{#snippet kindToggle()}
	<div class="grid grid-cols-2 gap-2" role="group" aria-label="Jenis dompet">
		<button
			type="button"
			aria-pressed={kind === 'digital'}
			onclick={() => (kind = 'digital')}
			class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
				{kind === 'digital'
				? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
				: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
		>
			<Smartphone size={14} /> Digital
		</button>
		<button
			type="button"
			aria-pressed={kind === 'cash'}
			onclick={() => (kind = 'cash')}
			class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
				{kind === 'cash'
				? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
				: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
		>
			<Banknote size={14} /> Tunai
		</button>
	</div>
{/snippet}

{#snippet editRow(w: WalletWithBalance)}
	<form method="POST" action="?/update" use:enhance={handleUpdate} novalidate class="space-y-3 px-4 py-3">
		<input type="hidden" name="id" value={w.id} />
		<input type="hidden" name="kind" value={editKind} />
		<div>
			<label for="edit-name-{w.id}" class="mb-1 block text-sm">Nama dompet</label>
			<input
				id="edit-name-{w.id}"
				name="name"
				type="text"
				required
				bind:value={editName}
				aria-invalid={!!editErrors.name}
				class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
					{editErrors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
			/>
			{#if editErrors.name}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.name}</p>{/if}
		</div>
		{@render kindToggle()}
		{#if editErrors.kind}<p class="text-xs text-red-600 dark:text-red-400">{editErrors.kind}</p>{/if}
		<div class="flex justify-end gap-2">
			<button
				type="button"
				onclick={() => (editingId = null)}
				class="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
			>
				Batal
			</button>
			<button
				type="submit"
				class="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white"
			>
				Simpan Perubahan
			</button>
		</div>
	</form>
{/snippet}

{#snippet walletRow(w: WalletWithBalance)}
	{#if editingId === w.id}
		{@render editRow(w)}
	{:else}
		<div class="flex items-center gap-3 px-4 py-3">
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-gray-900 dark:text-white">{w.name}</p>
				<p class="font-mono text-sm font-bold {w.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">
					{formatIDR(w.balance)}
				</p>
			</div>
			<div class="flex gap-1">
				<button
					onclick={() => openEdit(w)}
					aria-label="Edit {w.name}"
					class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600 dark:hover:bg-gray-800"
				>
					<Pencil size={15} />
				</button>
				<button
					onclick={() => (deleteTarget = w)}
					aria-label="Hapus {w.name}"
					class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
				>
					<Trash2 size={15} />
				</button>
			</div>
		</div>
	{/if}
{/snippet}

<main class="mx-auto max-w-3xl px-4 py-6">
	<h1 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Dompet</h1>

	<!-- Add form -->
	<form
		method="POST"
		action="?/create"
		use:enhance={handleCreate}
		novalidate
		class="mb-6 space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
	>
		<div>
			<label for="wallet-name" class="mb-1 block text-sm">Nama dompet</label>
			<input
				id="wallet-name"
				name="name"
				type="text"
				required
				placeholder="cth. GoPay, BCA, uang cash"
				bind:value={name}
				aria-invalid={!!errors.name}
				class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
					{errors.name ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
			/>
			{#if errors.name}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>{/if}
		</div>

		<div>
			<span class="mb-1 block text-sm">Jenis</span>
			{@render kindToggle()}
			{#if errors.kind}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.kind}</p>{/if}
			<input type="hidden" name="kind" value={kind} />
		</div>

		<div class="flex flex-wrap items-center gap-1.5">
			{#each PRESETS as p (p.name)}
				<button
					type="button"
					class="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					onclick={() => applyPreset(p)}
				>
					{p.name}
				</button>
			{/each}
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white"
			>
				Tambah Dompet
			</button>
		</div>
	</form>

	{#if listError}
		<p
			class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
			role="alert"
		>
			{listError}
		</p>
	{/if}

	{#if wallets.length === 0}
		<p
			class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
		>
			Belum ada dompet.
		</p>
	{:else}
		{#if digital.length > 0}
			<section class="mb-6" aria-label="Dompet digital">
				<h2 class="mb-2 flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
					<span class="text-sky-500"><Smartphone size={16} /></span> Digital
				</h2>
				<ul
					class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
				>
					{#each digital as w (w.id)}
						<li>{@render walletRow(w)}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if cash.length > 0}
			<section aria-label="Dompet tunai">
				<h2 class="mb-2 flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
					<span class="text-emerald-500"><Banknote size={16} /></span> Tunai
				</h2>
				<ul
					class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
				>
					{#each cash as w (w.id)}
						<li>{@render walletRow(w)}</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</main>

<ConfirmModal
	open={!!deleteTarget}
	title="Hapus Dompet"
	message={deleteTarget
		? `Hapus "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`
		: ''}
	confirmText={deleting ? 'Menghapus…' : 'Hapus'}
	onConfirm={() => deleteForm?.requestSubmit()}
	onCancel={() => (deleteTarget = null)}
/>

<form method="POST" action="?/delete" bind:this={deleteForm} use:enhance={handleDelete} class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>
