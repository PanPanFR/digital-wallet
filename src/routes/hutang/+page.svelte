<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Plus, Trash2, HandCoins, TrendingDown, TrendingUp, ArrowLeftRight } from '@lucide/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { modalAccessibility } from '$lib/modalAccessibility';
	import { notify } from '$lib/stores.svelte';
	import { formatIDR, formatDate, todayISO } from '$lib/format';
	import type { DebtRow, WalletRow } from '$lib/server/db';

	let { data } = $props();

	const PRESETS: [number, string][] = [
		[10_000, '+10rb'],
		[25_000, '+25rb'],
		[50_000, '+50rb'],
		[100_000, '+100rb'],
		[500_000, '+500rb'],
		[1_000_000, '+1jt']
	];

	// Create modal
	let showCreate = $state(false);
	let createSubmitting = $state(false);
	let person = $state('');
	let direction = $state<'owe' | 'owed'>('owe');
	let amount = $state<string | number | undefined>('');
	let date = $state(todayISO());
	let reduceBalance = $state(false);
	let walletId = $state('');
	let errors = $state<Record<string, string>>({});

	// Pay modal
	let payTarget = $state<DebtRow | null>(null);
	let paySubmitting = $state(false);
	let payAmount = $state('');
	let payWalletId = $state('');
	let payDate = $state(todayISO());
	let payErrors = $state<Record<string, string>>({});
	let payError = $state('');

	// Delete confirm
	let deleteTarget = $state<DebtRow | null>(null);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = null;

	const diff = $derived(data.totals.owed - data.totals.owe);

	function addPreset(value: number) {
		amount = String((Number(amount) || 0) + value);
	}

	function openCreate() {
		person = '';
		direction = 'owe';
		amount = '';
		date = todayISO();
		reduceBalance = false;
		walletId = '';
		errors = {};
		showCreate = true;
	}

	function openPay(d: DebtRow) {
		payTarget = d;
		payAmount = String(d.remaining);
		payWalletId = d.wallet_id ?? '';
		payDate = todayISO();
		payErrors = {};
		payError = '';
	}

	function closePay() {
		payTarget = null;
	}

	function pct(d: DebtRow) {
		return d.amount > 0 ? Math.min(100, (d.paid / d.amount) * 100) : 0;
	}

	const handleCreate: SubmitFunction = () => {
		createSubmitting = true;
		return async ({ result, update }) => {
			createSubmitting = false;
			if (result.type === 'failure' && result.data) {
				errors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Utang dicatat');
				showCreate = false;
			}
		};
	};

	const handlePay: SubmitFunction = () => {
		paySubmitting = true;
		return async ({ result, update }) => {
			paySubmitting = false;
			if (result.type === 'failure' && result.data) {
				const res = result.data as { errors?: Record<string, string>; error?: string };
				if (res.errors) payErrors = res.errors;
				else payError = res.error ?? 'Gagal menyimpan pembayaran';
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Pembayaran dicatat');
				payTarget = null;
			}
		};
	};

	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			deleting = false;
			deleteTarget = null;
			await update();
			if (result.type === 'success') notify('success', 'Catatan hutang dihapus');
			else if (result.type === 'failure' && result.data)
				notify('error', (result.data as { error?: string }).error ?? 'Gagal menghapus catatan hutang');
			else notify('error', 'Gagal menghapus catatan hutang');
		};
	};
</script>

<svelte:head>
	<title>Hutang · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="mb-4 flex items-center justify-between gap-3">
		<h1 class="text-xl font-semibold text-gray-900 dark:text-white">Hutang</h1>
		<button
			onclick={openCreate}
			class="flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 text-sm font-medium"
		>
			<Plus size={16} /> Catat
		</button>
	</div>

	<section class="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan hutang">
		<div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-red-500"><TrendingDown size={14} /></span>
				Hutang Saya
			</div>
			<p class="mt-1 font-mono text-lg font-bold text-red-600 dark:text-red-400">
				{formatIDR(data.totals.owe)}
			</p>
		</div>

		<div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-emerald-500"><TrendingUp size={14} /></span>
				Piutang Saya
			</div>
			<p class="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
				{formatIDR(data.totals.owed)}
			</p>
		</div>

		<div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
			<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
				<span class="text-sky-500"><ArrowLeftRight size={14} /></span>
				Selisih
			</div>
			<p
				class="mt-1 font-mono text-lg font-bold
				{diff < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}"
			>
				{formatIDR(diff)}
			</p>
		</div>
	</section>

	<section class="mt-6" aria-label="Daftar hutang">
		{#if data.debts.length === 0}
			<p
				class="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
			>
				Belum ada catatan hutang.
			</p>
		{:else}
			<ul
				class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900"
			>
				{#each data.debts as d (d.id)}
					<li class="px-4 py-3 {d.remaining === 0 ? 'opacity-60' : ''}">
						<div class="flex items-center gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-1.5">
									<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
										{d.person}
									</p>
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap
										{d.direction === 'owe'
										? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
										: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'}"
									>
										{d.direction === 'owe' ? 'Utang' : 'Piutang'}
									</span>
									{#if d.remaining === 0}
										<span
											class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
										>
											Lunas
										</span>
									{/if}
								</div>
								<p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
									<span>{formatDate(d.date)}</span>
									{#if d.wallet_name}
										<span
											class="rounded-full bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
										>
											{d.wallet_name}
										</span>
									{/if}
								</p>
								<div
									class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
									role="progressbar"
									aria-valuenow={Math.round(pct(d))}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label="Progress pelunasan {d.person}"
								>
									<div
										class="h-full rounded-full {d.direction === 'owe' ? 'bg-red-500' : 'bg-emerald-500'}"
										style="width: {pct(d)}%"
									></div>
								</div>
							</div>
							<div class="flex flex-col items-end gap-1.5">
								<div class="text-right">
									<p class="text-[10px] text-gray-400 dark:text-gray-500">Sisa</p>
									<span
										class="whitespace-nowrap font-mono text-sm font-bold
										{d.remaining === 0
										? 'text-emerald-600 dark:text-emerald-400'
										: 'text-gray-900 dark:text-white'}"
									>
										{formatIDR(d.remaining)}
									</span>
								</div>
								<div class="flex gap-1">
									{#if d.remaining > 0}
										<button
											onclick={() => openPay(d)}
											class="rounded-lg bg-sky-600 hover:bg-sky-500 px-2.5 py-1 text-xs font-medium text-white"
										>
											Bayar
										</button>
									{/if}
									<button
										onclick={() => (deleteTarget = d)}
										aria-label="Hapus catatan hutang {d.person}"
										class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
									>
										<Trash2 size={15} />
									</button>
								</div>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<!-- Modal Catat Utang -->
{#if showCreate}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showCreate = false)}>
		<div
			class="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
			role="dialog"
			aria-modal="true"
			aria-labelledby="debt-form-title"
			tabindex="-1"
			use:modalAccessibility={{ onClose: () => (showCreate = false) }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between">
				<div>
					<h2 id="debt-form-title" class="font-semibold">Catat Utang</h2>
					<p class="text-xs text-gray-500 dark:text-gray-400">Catat utang kamu atau piutang orang lain</p>
				</div>
				<button
					class="opacity-60 hover:opacity-100"
					aria-label="Tutup dialog"
					disabled={createSubmitting}
					onclick={() => (showCreate = false)}
				>
					<HandCoins size={18} />
				</button>
			</div>

			<form method="POST" action="?/create" use:enhance={handleCreate} novalidate class="space-y-4">
				<div>
					<label for="debt-person" class="mb-1 block text-sm">Nama</label>
					<input
						id="debt-person"
						name="person"
						type="text"
						required
						maxlength={60}
						placeholder="cth. Budi, Ibu Sari"
						bind:value={person}
						aria-invalid={!!errors.person}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{errors.person ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if errors.person}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.person}</p>{/if}
				</div>

				<div>
					<span class="mb-1 block text-sm">Arah</span>
					<input type="hidden" name="direction" value={direction} />
					<div class="grid grid-cols-2 gap-2" role="group" aria-label="Arah hutang">
						<button
							type="button"
							aria-pressed={direction === 'owe'}
							onclick={() => (direction = 'owe')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
								{direction === 'owe'
								? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
								: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
						>
							<TrendingDown size={14} /> Saya Berhutang
						</button>
						<button
							type="button"
							aria-pressed={direction === 'owed'}
							onclick={() => (direction = 'owed')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm
								{direction === 'owed'
								? 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
								: 'border-gray-200 text-gray-500 dark:border-gray-700'}"
						>
							<TrendingUp size={14} /> Saya Meminjamkan
						</button>
					</div>
					{#if errors.direction}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.direction}</p>{/if}
				</div>

				<div>
					<div class="mb-1 flex items-center justify-between">
						<label for="debt-amount" class="text-sm">Jumlah (IDR)</label>
						{#if amount && Number(amount) > 0}
							<span class="text-xs font-bold text-sky-600 dark:text-sky-400">
								Rp {Number(amount).toLocaleString('id-ID')}
							</span>
						{/if}
					</div>
					<input
						id="debt-amount"
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
					{#if errors.amount}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.amount}</p>{/if}
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
					<label for="debt-date" class="mb-1 block text-sm">Tanggal</label>
					<input
						id="debt-date"
						name="date"
						type="date"
						bind:value={date}
						aria-invalid={!!errors.date}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{errors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if errors.date}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.date}</p>{/if}
				</div>

				<div class="space-y-2">
					<label for="debt-reduce" class="flex items-start gap-2 text-sm">
						<input
							id="debt-reduce"
							type="checkbox"
							name="reduceBalance"
							bind:checked={reduceBalance}
							class="mt-0.5 h-4 w-4 rounded border-gray-300 text-sky-600 dark:border-gray-600"
						/>
						<span>Langsung kurangi saldo dompet ini</span>
					</label>

					{#if reduceBalance}
						<div>
							<label for="debt-wallet" class="mb-1 block text-sm">Dompet</label>
							<select
								id="debt-wallet"
								name="walletId"
								bind:value={walletId}
								required
								aria-invalid={!!errors.walletId}
								class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
									{errors.walletId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
							>
								<option value="" disabled>Pilih dompet</option>
								{#each ['digital', 'cash'] as kind (kind)}
									{@const group = data.wallets.filter((w: WalletRow) => w.kind === kind)}
									{#if group.length > 0}
										<optgroup label={kind === 'digital' ? 'Digital' : 'Tunai'}>
											{#each group as w (w.id)}
												<option value={w.id}>{w.name}</option>
											{/each}
										</optgroup>
									{/if}
								{/each}
							</select>
							{#if errors.walletId}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.walletId}</p>{/if}
						</div>
					{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						disabled={createSubmitting}
						onclick={() => (showCreate = false)}
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={createSubmitting}
						class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
					>
						{createSubmitting ? 'Menyimpan…' : 'Catat'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal Bayar -->
{#if payTarget}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={closePay}>
		<div
			class="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pay-form-title"
			tabindex="-1"
			use:modalAccessibility={{ onClose: closePay }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between">
				<div>
					<h2 id="pay-form-title" class="font-semibold">Bayar — {payTarget.person}</h2>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{payTarget.direction === 'owe' ? 'Utang' : 'Piutang'} · {formatDate(payTarget.date)}
					</p>
				</div>
				<button class="opacity-60 hover:opacity-100" aria-label="Tutup dialog" disabled={paySubmitting} onclick={closePay}>
					✕
				</button>
			</div>

			{#if payError}
				<p
					class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
					role="alert"
				>
					{payError}
				</p>
			{/if}

			<form method="POST" action="?/pay" use:enhance={handlePay} novalidate class="space-y-4">
				<input type="hidden" name="debtId" value={payTarget.id} />

				<div>
					<div class="mb-1 flex items-center justify-between">
						<label for="pay-amount" class="text-sm">Jumlah (IDR)</label>
						<span class="text-xs text-gray-500 dark:text-gray-400">Sisa: {formatIDR(payTarget.remaining)}</span>
					</div>
					<input
						id="pay-amount"
						name="amount"
						type="number"
						min="1"
						max={payTarget.remaining}
						step="1"
						required
						bind:value={payAmount}
						aria-invalid={!!payErrors.amount}
						class="w-full rounded-lg border px-3 py-2 font-bold bg-white dark:bg-gray-950
							{payErrors.amount ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if payErrors.amount}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{payErrors.amount}</p>{/if}
				</div>

				<div>
					<label for="pay-wallet" class="mb-1 block text-sm">Dompet</label>
					<select
						id="pay-wallet"
						name="walletId"
						bind:value={payWalletId}
						required
						aria-invalid={!!payErrors.walletId}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{payErrors.walletId ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					>
						<option value="" disabled>Pilih dompet</option>
						{#each ['digital', 'cash'] as kind (kind)}
							{@const group = data.wallets.filter((w: WalletRow) => w.kind === kind)}
							{#if group.length > 0}
								<optgroup label={kind === 'digital' ? 'Digital' : 'Tunai'}>
									{#each group as w (w.id)}
										<option value={w.id}>{w.name}</option>
									{/each}
								</optgroup>
							{/if}
						{/each}
					</select>
					{#if payErrors.walletId}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{payErrors.walletId}</p>{/if}
				</div>

				<div>
					<label for="pay-date" class="mb-1 block text-sm">Tanggal</label>
					<input
						id="pay-date"
						name="date"
						type="date"
						bind:value={payDate}
						aria-invalid={!!payErrors.date}
						class="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-950
							{payErrors.date ? 'border-red-400' : 'border-gray-300 dark:border-gray-700'}"
					/>
					{#if payErrors.date}<p class="mt-1 text-xs text-red-600 dark:text-red-400">{payErrors.date}</p>{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						disabled={paySubmitting}
						onclick={closePay}
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={paySubmitting}
						class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
					>
						{paySubmitting ? 'Menyimpan…' : 'Bayar'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<ConfirmModal
	open={!!deleteTarget}
	title="Hapus Catatan Hutang"
	message={deleteTarget
		? `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(deleteTarget.amount)})? Tindakan ini tidak bisa dibatalkan.`
		: ''}
	confirmText={deleting ? 'Menghapus…' : 'Hapus'}
	onConfirm={() => deleteForm?.requestSubmit()}
	onCancel={() => (deleteTarget = null)}
/>

<form method="POST" action="?/delete" bind:this={deleteForm} use:enhance={handleDelete} class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>
