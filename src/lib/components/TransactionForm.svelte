<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { ArrowLeftRight, TrendingDown, TrendingUp, X } from '@lucide/svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';
	import { notify } from '$lib/stores.svelte';
	import { CATEGORIES, AMOUNT_PRESETS } from '$lib/constants';
	import WalletSelect from '$lib/components/WalletSelect.svelte';
	import { todayISO } from '$lib/format';
	import type { TxRow, WalletRow } from '$lib/server/db';

	let {
		transaction = null,
		wallets = [] as WalletRow[],
		open = false,
		onclose
	}: { transaction?: TxRow | null; wallets?: WalletRow[]; open?: boolean; onclose: () => void } = $props();

	let submitting = $state(false);
	let description = $state('');
	let amount = $state<string | number | undefined>('');
	let type = $state<TxRow['type']>('expense');
	let category = $state<string>(CATEGORIES[0]);
	let walletId = $state('');
	let toWalletId = $state('');
	let date = $state(todayISO());
	let errors = $state<Record<string, string>>({});

	const isEdit = $derived(!!transaction);

	$effect(() => {
		if (open) {
			description = transaction?.description ?? '';
			amount = transaction ? String(transaction.amount) : '';
			type = transaction?.type ?? 'expense';
			category = transaction?.category ?? CATEGORIES[0];
			walletId = transaction?.wallet_id ?? '';
			toWalletId = transaction?.to_wallet_id ?? '';
			date = transaction?.date ?? todayISO();
			errors = {};
		}
	});

	function addPreset(value: number) {
		amount = String((Number(amount) || 0) + value);
	}

	const handleSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ result, update }) => {
			submitting = false;
			if (result.type === 'failure' && result.data) {
				errors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', isEdit ? 'Transaksi diperbarui' : 'Transaksi tersimpan');
				onclose();
			}
		};
	};
</script>

<ModalShell {open} labelledby="transaction-form-title" onClose={onclose}>
	<div class="flex items-center justify-between">
		<div>
			<h2 id="transaction-form-title" class="font-semibold">
				{isEdit ? 'Edit Transaksi' : 'Catat Transaksi'}
			</h2>
			<p class="text-xs text-slate-500 dark:text-slate-400">
				{isEdit ? 'Ubah detail transaksi yang ada' : 'Tambahkan pengeluaran atau pemasukan'}
			</p>
		</div>
		<button
			class="btn btn-ghost p-1.5"
			aria-label="Tutup dialog"
			disabled={submitting}
			onclick={onclose}
		>
			<X size={18} />
		</button>
	</div>

			<form method="POST" action={isEdit ? '?/update' : '?/create'} use:enhance={handleSubmit} class="space-y-4" novalidate>
				<input type="hidden" name="id" value={transaction?.id ?? ''} />
				<input type="hidden" name="type" value={type} />

				<div>
					<span class="label">Tipe</span>
					<div class="grid grid-cols-3 gap-2" role="group" aria-label="Tipe transaksi">
						<button
							type="button"
							aria-pressed={type === 'expense'}
							onclick={() => (type = 'expense')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 px-1 text-sm transition-colors
								{type === 'expense'
								? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
								: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}"
						>
							<TrendingDown size={14} /> Pengeluaran
						</button>
						<button
							type="button"
							aria-pressed={type === 'income'}
							onclick={() => (type = 'income')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 px-1 text-sm transition-colors
								{type === 'income'
								? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
								: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}"
						>
							<TrendingUp size={14} /> Pemasukan
						</button>
						<button
							type="button"
							aria-pressed={type === 'transfer'}
							onclick={() => (type = 'transfer')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 px-1 text-sm transition-colors
								{type === 'transfer'
								? 'border-slate-400 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
								: 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}"
						>
							<ArrowLeftRight size={14} /> Transfer
						</button>
					</div>
					{#if errors.type}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.type}</p>{/if}
				</div>

				<div>
					<label for="tx-date" class="label">Tanggal</label>
					<input
						id="tx-date"
						name="date"
						type="date"
						bind:value={date}
						aria-invalid={!!errors.date}
						class="input {errors.date ? 'border-red-400 dark:border-red-500' : ''}"
					/>
					{#if errors.date}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.date}</p>{/if}
				</div>

				<div>
					<label for="tx-wallet" class="label">Dompet</label>
					<WalletSelect
						id="tx-wallet"
						name="walletId"
						bind:value={walletId}
						required
						invalid={!!errors.walletId}
						{wallets}
					/>
					{#if errors.walletId}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.walletId}</p>{/if}
				</div>

				{#if type === 'transfer'}
					<div>
						<label for="tx-to-wallet" class="label">Dompet tujuan</label>
						<WalletSelect
							id="tx-to-wallet"
							name="toWalletId"
							bind:value={toWalletId}
							required
							invalid={!!errors.toWalletId}
							excludeId={walletId}
							placeholder="Pilih dompet tujuan"
							{wallets}
						/>
						{#if errors.toWalletId}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.toWalletId}</p>{/if}
					</div>
				{/if}

				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="tx-amount" class="text-sm font-medium text-slate-700 dark:text-slate-300">Jumlah (IDR)</label>
						{#if amount && Number(amount) > 0}
							<span class="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
								Rp {Number(amount).toLocaleString('id-ID')}
							</span>
						{/if}
					</div>
					<input
						id="tx-amount"
						name="amount"
						type="number"
						min="1"
						step="1"
						required
						placeholder="0"
						bind:value={amount}
						aria-invalid={!!errors.amount}
						class="input text-lg font-semibold tabular-nums {errors.amount ? 'border-red-400 dark:border-red-500' : ''}"
					/>
					{#if errors.amount}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.amount}</p>{/if}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each AMOUNT_PRESETS as [value, label] (label)}
							<button
								type="button"
								class="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
								onclick={() => addPreset(value)}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="tx-description" class="label">Deskripsi</label>
					<input
						id="tx-description"
						name="description"
						type="text"
						required
						placeholder="cth. Kopi susu, tiket KRL, gaji freelance"
						bind:value={description}
						aria-invalid={!!errors.description}
						class="input {errors.description ? 'border-red-400 dark:border-red-500' : ''}"
					/>
					{#if errors.description}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.description}</p>{/if}
				</div>

				<div>
					<label for="tx-category" class="label">Kategori</label>
					<select id="tx-category" name="category" bind:value={category} class="input">
						{#each CATEGORIES as c (c)}
							<option value={c}>{c}</option>
						{/each}
					</select>
					{#if errors.category}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.category}</p>{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button type="button" disabled={submitting} onclick={onclose} class="btn btn-outline px-4 py-2">
						Batal
					</button>
					<button type="submit" disabled={submitting} class="btn btn-primary px-4 py-2">
						{submitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Catat'}
					</button>
				</div>
			</form>
</ModalShell>
