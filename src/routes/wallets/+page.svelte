<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Pencil, Trash2, Smartphone, Banknote, Wallet as WalletIcon, X } from '@lucide/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';
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

	let adjustTarget = $state<WalletWithBalance | null>(null);
	let adjustValue = $state(0);
	let adjustErrors = $state<Record<string, string>>({});
	let adjusting = $state(false);

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

	function openAdjust(w: WalletWithBalance) {
		adjustTarget = w;
		adjustValue = w.balance;
		adjustErrors = {};
		adjusting = false;
		listError = '';
	}

	const handleAdjust: SubmitFunction = () => {
		adjusting = true;
		return async ({ result, update }) => {
			adjusting = false;
			if (result.type === 'failure' && result.data) {
				adjustErrors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Saldo diperbarui');
				adjustTarget = null;
				adjustErrors = {};
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
			class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors
				{kind === 'digital'
				? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
				: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}"
		>
			<Smartphone size={14} /> Digital
		</button>
		<button
			type="button"
			aria-pressed={kind === 'cash'}
			onclick={() => (kind = 'cash')}
			class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors
				{kind === 'cash'
				? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
				: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}"
		>
			<Banknote size={14} /> Tunai
		</button>
	</div>
{/snippet}

{#snippet editRow(w: WalletWithBalance)}
	<form method="POST" action="?/update" use:enhance={handleUpdate} novalidate class="space-y-3 p-4">
		<input type="hidden" name="id" value={w.id} />
		<input type="hidden" name="kind" value={editKind} />
		<div>
			<label for="edit-name-{w.id}" class="label">Nama dompet</label>
			<input
				id="edit-name-{w.id}"
				name="name"
				type="text"
				required
				bind:value={editName}
				aria-invalid={!!editErrors.name}
				class="input {editErrors.name ? 'border-red-400' : ''}"
			/>
			{#if editErrors.name}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{editErrors.name}</p>{/if}
		</div>
		{@render kindToggle()}
		{#if editErrors.kind}<p class="text-xs text-red-600 dark:text-red-400">{editErrors.kind}</p>{/if}
		<div class="flex justify-end gap-2">
			<button
				type="button"
				onclick={() => (editingId = null)}
				class="btn btn-outline px-4 py-2"
			>
				Batal
			</button>
			<button
				type="submit"
				class="btn btn-primary px-4 py-2"
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
		<div class="list-row">
		<div
			class="tile h-9 w-9
			{w.kind === 'digital'
				? 'bg-sky-50 text-sky-500 dark:bg-sky-950'
				: 'bg-amber-50 text-amber-500 dark:bg-amber-950'}"
			aria-hidden="true"
		>
				{#if w.kind === 'digital'}
					<Smartphone size={18} />
				{:else}
					<Banknote size={18} />
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium text-slate-900 dark:text-white">{w.name}</p>
				<p class="tabular-nums text-sm font-semibold {w.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}">
					{formatIDR(w.balance)}
				</p>
			</div>
			<div class="flex gap-1">
				<button
					onclick={() => openAdjust(w)}
					aria-label="Atur saldo {w.name}"
					class="btn btn-ghost rounded-lg p-1.5 hover:text-emerald-600"
				>
					<WalletIcon size={15} />
				</button>
				<button
					onclick={() => openEdit(w)}
					aria-label="Edit {w.name}"
					class="btn btn-ghost rounded-lg p-1.5"
				>
					<Pencil size={15} />
				</button>
				<button
					onclick={() => (deleteTarget = w)}
					aria-label="Hapus {w.name}"
					class="btn btn-ghost rounded-lg p-1.5 hover:text-red-600 dark:hover:text-red-400"
				>
					<Trash2 size={15} />
				</button>
			</div>
		</div>
	{/if}
{/snippet}

<main class="mx-auto max-w-3xl px-4 py-6">
	<h1 class="page-title mb-4">Dompet</h1>

	<!-- Add form -->
	<form
		method="POST"
		action="?/create"
		use:enhance={handleCreate}
		novalidate
		class="card mb-6 space-y-3 p-4"
	>
		<div>
			<label for="wallet-name" class="label">Nama dompet</label>
			<input
				id="wallet-name"
				name="name"
				type="text"
				required
				placeholder="cth. GoPay, BCA, uang cash"
				bind:value={name}
				aria-invalid={!!errors.name}
				class="input {errors.name ? 'border-red-400' : ''}"
			/>
			{#if errors.name}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>{/if}
		</div>

		<div>
			<span class="label">Jenis</span>
			{@render kindToggle()}
			{#if errors.kind}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.kind}</p>{/if}
			<input type="hidden" name="kind" value={kind} />
		</div>

		<div class="flex flex-wrap items-center gap-1.5">
			{#each PRESETS as p (p.name)}
				<button
					type="button"
					class="chip py-1 transition-colors
						{name === p.name && kind === p.kind
						? 'bg-orange-600 text-white'
						: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}"
					onclick={() => applyPreset(p)}
				>
					{p.name}
				</button>
			{/each}
		</div>

		<div class="flex justify-end">
			<button
				type="submit"
				class="btn btn-primary px-4 py-2"
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
		<div class="card py-12 text-center">
			<div
				class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
				aria-hidden="true"
			>
				<WalletIcon size={22} />
			</div>
			<p class="text-sm font-medium text-slate-900 dark:text-white">Belum ada dompet</p>
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				Tambahkan dompet pertama lewat formulir di atas.
			</p>
		</div>
	{:else}
		{#if digital.length > 0}
			<section class="mb-6" aria-label="Dompet digital">
				<h2 class="section-title mb-2 flex items-center gap-1.5">
					<span class="text-sky-500"><Smartphone size={16} /></span> Digital
				</h2>
				<ul
					class="list"
				>
					{#each digital as w (w.id)}
						<li>{@render walletRow(w)}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if cash.length > 0}
			<section aria-label="Dompet tunai">
				<h2 class="section-title mb-2 flex items-center gap-1.5">
					<span class="text-amber-500"><Banknote size={16} /></span> Tunai
				</h2>
				<ul
					class="list"
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

<ModalShell
	open={!!adjustTarget}
	title="Atur saldo"
	width="max-w-sm"
	onClose={() => (adjustTarget = null)}
>
	{#if adjustTarget}
		<form method="POST" action="?/adjust" use:enhance={handleAdjust} novalidate class="space-y-4">
			<input type="hidden" name="id" value={adjustTarget.id} />
			<div class="flex items-center justify-between">
				<h3 class="font-semibold text-slate-900 dark:text-white">Atur Saldo — {adjustTarget.name}</h3>
				<button
					type="button"
					class="btn btn-ghost p-1.5"
					aria-label="Tutup dialog"
					onclick={() => (adjustTarget = null)}
				>
					<X size={18} />
				</button>
			</div>
			<div>
				<label for="adjust-balance" class="label">Saldo baru</label>
				<input
					id="adjust-balance"
					name="newBalance"
					type="number"
					min="0"
					required
					bind:value={adjustValue}
					aria-invalid={!!adjustErrors.newBalance}
					class="input tabular-nums {adjustErrors.newBalance ? 'border-red-400' : ''}"
				/>
				{#if adjustErrors.newBalance}
					<p class="mt-1 text-xs text-red-600 dark:text-red-400">{adjustErrors.newBalance}</p>
				{/if}
			</div>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				Saldo saat ini {formatIDR(adjustTarget.balance)}. Perubahan dicatat sebagai transaksi "Penyesuaian saldo".
			</p>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="btn btn-outline px-3 py-2"
					onclick={() => (adjustTarget = null)}
				>
					Batal
				</button>
				<button
					type="submit"
					disabled={adjusting}
					class="btn btn-primary px-3 py-2"
				>
					{adjusting ? 'Menyimpan…' : 'Simpan'}
				</button>
			</div>
		</form>
	{/if}
</ModalShell>

<form method="POST" action="?/delete" bind:this={deleteForm} use:enhance={handleDelete} class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>
