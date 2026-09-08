<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { ArrowLeftRight, TrendingDown, TrendingUp, X } from '@lucide/svelte';
	import { modalAccessibility } from '$lib/modalAccessibility';
	import { notify } from '$lib/stores.svelte';
	import { CATEGORIES } from '$lib/constants';
	import { todayISO } from '$lib/format';
	import type { TxRow, WalletRow } from '$lib/server/db';

	let {
		transaction = null,
		wallets = [] as WalletRow[],
		open = false,
		onclose
	}: { transaction?: TxRow | null; wallets?: WalletRow[]; open?: boolean; onclose: () => void } = $props();

	const PRESETS: [number, string][] = [
		[10_000, '+10rb'],
		[25_000, '+25rb'],
		[50_000, '+50rb'],
		[100_000, '+100rb'],
		[500_000, '+500rb'],
		[1_000_000, '+1jt']
	];

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

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onclick={onclose}>
		<div
			class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-5 space-y-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="transaction-form-title"
			tabindex="-1"
			use:modalAccessibility={{ onClose: onclose }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between">
				<div>
					<h2 id="transaction-form-title" class="font-semibold">
						{isEdit ? 'Edit Transaksi' : 'Catat Transaksi'}
					</h2>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{isEdit ? 'Ubah detail transaksi yang ada' : 'Tambahkan pengeluaran atau pemasukan'}
					</p>
				</div>
				<button
					class="opacity-60 hover:opacity-100"
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
					<span class="block text-sm mb-1">Tipe</span>
					<div class="grid grid-cols-3 gap-2" role="group" aria-label="Tipe transaksi">
						<button
							type="button"
							aria-pressed={type === 'expense'}
							onclick={() => (type = 'expense')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
								{type === 'expense'
								? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
								: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
						>
							<TrendingDown size={14} /> Pengeluaran
						</button>
						<button
							type="button"
							aria-pressed={type === 'income'}
							onclick={() => (type = 'income')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
								{type === 'income'
								? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
								: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
						>
							<TrendingUp size={14} /> Pemasukan
						</button>
						<button
							type="button"
							aria-pressed={type === 'transfer'}
							onclick={() => (type = 'transfer')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
								{type === 'transfer'
								? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
								: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
						>
							<ArrowLeftRight size={14} /> Transfer
						</button>
					</div>
					{#if errors.type}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.type}</p>{/if}
				</div>

				<div>
					<label for="tx-date" class="block text-sm mb-1">Tanggal</label>
					<input
						id="tx-date"
						name="date"
						type="date"
						bind:value={date}
						aria-invalid={!!errors.date}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if errors.date}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.date}</p>{/if}
				</div>

				<div>
					<label for="tx-wallet" class="block text-sm mb-1">Dompet</label>
					<select
						id="tx-wallet"
						name="walletId"
						bind:value={walletId}
						required
						aria-invalid={!!errors.walletId}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{errors.walletId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					>
						<option value="" disabled>Pilih dompet</option>
						{#each ['digital', 'cash'] as kind (kind)}
							{@const group = wallets.filter((w) => w.kind === kind)}
							{#if group.length > 0}
								<optgroup label={kind === 'digital' ? 'Digital' : 'Tunai'}>
									{#each group as w (w.id)}
										<option value={w.id}>{w.name}</option>
									{/each}
								</optgroup>
							{/if}
						{/each}
					</select>
					{#if errors.walletId}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.walletId}</p>{/if}
				</div>

				{#if type === 'transfer'}
					<div>
						<label for="tx-to-wallet" class="block text-sm mb-1">Dompet tujuan</label>
						<select
							id="tx-to-wallet"
							name="toWalletId"
							bind:value={toWalletId}
							required
							aria-invalid={!!errors.toWalletId}
							class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
								{errors.toWalletId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
						>
							<option value="" disabled>Pilih dompet tujuan</option>
							{#each ['digital', 'cash'] as kind (kind)}
								{@const group = wallets.filter((w) => w.kind === kind && w.id !== walletId)}
								{#if group.length > 0}
									<optgroup label={kind === 'digital' ? 'Digital' : 'Tunai'}>
										{#each group as w (w.id)}
											<option value={w.id}>{w.name}</option>
										{/each}
									</optgroup>
								{/if}
							{/each}
						</select>
						{#if errors.toWalletId}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.toWalletId}</p>{/if}
					</div>
				{/if}

				<div>
					<div class="flex items-center justify-between mb-1">
						<label for="tx-amount" class="text-sm">Jumlah (IDR)</label>
						{#if amount && Number(amount) > 0}
							<span class="text-xs font-bold text-sky-600 dark:text-sky-400">
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
						class="w-full rounded-lg border px-3 py-2 font-bold bg-white dark:bg-gray-950
							{errors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if errors.amount}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.amount}</p>{/if}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each PRESETS as [value, label] (label)}
							<button
								type="button"
								class="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
								onclick={() => addPreset(value)}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="tx-description" class="block text-sm mb-1">Deskripsi</label>
					<input
						id="tx-description"
						name="description"
						type="text"
						required
						placeholder="cth. Kopi susu, tiket KRL, gaji freelance"
						bind:value={description}
						aria-invalid={!!errors.description}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{errors.description ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if errors.description}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.description}</p>{/if}
				</div>

				<div>
					<label for="tx-category" class="block text-sm mb-1">Kategori</label>
					<select
						id="tx-category"
						name="category"
						bind:value={category}
						class="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-950"
					>
						{#each CATEGORIES as c (c)}
							<option value={c}>{c}</option>
						{/each}
					</select>
					{#if errors.category}<p class="text-xs text-red-600 dark:text-red-400 mt-1">{errors.category}</p>{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						disabled={submitting}
						onclick={onclose}
						class="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={submitting}
						class="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium"
					>
						{submitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Catat'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
