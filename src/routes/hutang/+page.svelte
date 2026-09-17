<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Plus, Trash2, TrendingDown, TrendingUp, ArrowLeftRight, X, CircleCheck, Clock } from '@lucide/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';
	import WalletSelect from '$lib/components/WalletSelect.svelte';
	import { notify } from '$lib/stores.svelte';
	import { formatIDR, formatDate, todayISO } from '$lib/format';
	import { AMOUNT_PRESETS } from '$lib/constants';
	import type { DebtRow, WalletRow } from '$lib/server/db';

	let { data } = $props();

	// Avatar initial: tinted by direction (owe red / owed green)
	function avatarTint(d: DebtRow) {
		return d.direction === 'owe' ? 'bg-ctp-red/15 text-ctp-red' : 'bg-ctp-green/15 text-ctp-green';
	}

	function initials(name: string) {
		return (
			name
				.trim()
				.split(/\s+/)
				.map((w) => [...w][0])
				.filter(Boolean)
				.slice(0, 2)
				.join('')
				.toUpperCase() || '?'
		);
	}

	// KPI icon tiles: red hutang, green piutang, neutral selisih
	const kpiTiles = {
		owe: 'bg-ctp-red/10 text-ctp-red',
		owed: 'bg-ctp-green/10 text-ctp-green',
		diff: 'bg-ctp-surface0 text-ctp-subtext0'
	} as const;

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

	// Bulk select
	let selected = $state(new Set<string>());
	let showBulkConfirm = $state(false);
	let bulkDeleting = $state(false);
	let bulkForm: HTMLFormElement | null = null;
	let selectAllEl = $state<HTMLInputElement | null>(null);

	const selectedCount = $derived(selected.size);
	const allSelected = $derived(data.debts.length > 0 && selectedCount === data.debts.length);
	const indeterminate = $derived(selectedCount > 0 && !allSelected);

	$effect(() => {
		if (selectAllEl) selectAllEl.indeterminate = indeterminate;
	});

	function toggleAll() {
		selected = allSelected ? new Set() : new Set(data.debts.map((d) => d.id));
	}

	function toggleRow(id: string) {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

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

	const handleBulkDelete: SubmitFunction = () => {
		bulkDeleting = true;
		return async ({ result, update }) => {
			bulkDeleting = false;
			showBulkConfirm = false;
			await update();
			if (result.type === 'success') {
				const res = result.data as { deleted?: number };
				selected = new Set();
				notify('success', `${res.deleted ?? 0} catatan hutang dihapus`);
			} else if (result.type === 'failure' && result.data) {
				notify('error', (result.data as { error?: string }).error ?? 'Gagal menghapus catatan hutang');
			} else notify('error', 'Gagal menghapus catatan hutang');
		};
	};
</script>

<svelte:head>
	<title>Hutang · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-6">
	<div class="page-header">
		<h1 class="page-title">Hutang</h1>
		<button onclick={openCreate} class="btn btn-primary px-3 py-2">
			<Plus size={16} /> Catat
		</button>
	</div>

	<section class="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan hutang">
		<div class="card p-4">
			<div class="flex items-center gap-2.5">
				<span class="tile {kpiTiles.owe}">
					<TrendingDown size={16} />
				</span>
				<div>
					<p class="text-xs text-ctp-subtext0">Hutang Saya</p>
					<p class="num text-lg font-bold tabular-nums text-ctp-red">
						{formatIDR(data.totals.owe)}
					</p>
				</div>
			</div>
		</div>

		<div class="card p-4">
			<div class="flex items-center gap-2.5">
				<span class="tile {kpiTiles.owed}">
					<TrendingUp size={16} />
				</span>
				<div>
					<p class="text-xs text-ctp-subtext0">Piutang Saya</p>
					<p class="num text-lg font-bold tabular-nums text-ctp-green">
						{formatIDR(data.totals.owed)}
					</p>
				</div>
			</div>
		</div>

		<div class="card p-4">
			<div class="flex items-center gap-2.5">
				<span class="tile {kpiTiles.diff}">
					<ArrowLeftRight size={16} />
				</span>
				<div>
					<p class="text-xs text-ctp-subtext0">Selisih</p>
					<p
						class="num text-2xl font-extrabold tabular-nums
						{diff < 0 ? 'text-ctp-red' : 'text-ctp-text'}"
					>
						{formatIDR(diff)}
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="mt-6" aria-label="Daftar hutang">
		{#if data.debts.length === 0}
			<div class="card py-12 text-center">
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-surface0 text-ctp-subtext0"
					aria-hidden="true"
				>
					<TrendingDown size={22} />
				</div>
				<p class="text-sm font-medium text-ctp-text">Belum ada catatan hutang.</p>
				<p class="mt-1 text-xs text-ctp-subtext0">Catat utang atau piutang dengan tombol Catat.</p>
			</div>
		{:else}
			<div class="mb-2 flex items-center justify-between gap-3">
				<label for="select-all-debts" class="flex items-center gap-2 text-sm text-ctp-subtext1">
					<input
						id="select-all-debts"
						bind:this={selectAllEl}
						type="checkbox"
						checked={allSelected}
						onchange={toggleAll}
						aria-label="Pilih semua catatan hutang"
						class="h-4 w-4 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1"
					/>
					Pilih semua
				</label>
				{#if selectedCount > 0}
					<div class="flex items-center gap-2">
						<span class="text-xs text-ctp-subtext0">Menghapus yang terpilih di halaman ini saja.</span>
						<button
							type="button"
							onclick={() => (showBulkConfirm = true)}
							aria-label="Hapus {selectedCount} catatan hutang terpilih"
							class="btn btn-danger px-3 py-2"
						>
							<Trash2 size={16} /> Hapus ({selectedCount})
						</button>
					</div>
				{/if}
			</div>
		<ul class="list">
				{#each data.debts as d (d.id)}
					<li class="list-row {d.remaining === 0 ? 'opacity-60' : ''}">
						<div class="flex items-center gap-3">
							<input
								type="checkbox"
								checked={selected.has(d.id)}
								onchange={() => toggleRow(d.id)}
								aria-label="Pilih catatan hutang {d.person}"
								class="h-4 w-4 shrink-0 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1"
							/>
							<span
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold {avatarTint(
									d
								)}"
								aria-hidden="true"
							>
								{initials(d.person)}
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-1.5">
									<p class="truncate text-sm font-medium text-ctp-text">
										{d.person}
									</p>
								<span
									class="chip
									{d.direction === 'owe'
									? 'bg-ctp-red/10 text-ctp-red'
									: 'bg-ctp-green/10 text-ctp-green'}"
								>
									{#if d.direction === 'owe'}<TrendingDown size={12} aria-hidden="true" />{:else}<TrendingUp size={12} aria-hidden="true" />{/if}
									{d.direction === 'owe' ? 'Utang' : 'Piutang'}
								</span>
									{#if d.remaining === 0}
										<span class="chip bg-ctp-green/10 text-ctp-green">
											<CircleCheck size={12} aria-hidden="true" /> Lunas
										</span>
									{:else}
										<span class="chip chip-warn bg-ctp-yellow/20 font-semibold ring-1 ring-inset ring-ctp-yellow/40">
											<Clock size={12} aria-hidden="true" /> Belum
										</span>
									{/if}
								</div>
								<p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ctp-subtext0">
									<span>{formatDate(d.date)}</span>
									{#if d.wallet_name}
										<!-- ponytail: DebtRow has no wallet_kind; neutral chip until load adds it -->
										<span class="rounded-full bg-ctp-surface0 px-1.5 py-0.5 font-medium text-ctp-subtext0">
											{d.wallet_name}
										</span>
									{/if}
								</p>
								<div
									class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ctp-surface0"
									role="progressbar"
									aria-valuenow={Math.round(pct(d))}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label="Progress pelunasan {d.person}"
								>
								<div
									class="h-full rounded-full bg-ctp-peach"
									style="width: {pct(d)}%"
								></div>
								</div>
							</div>
							<div class="flex flex-col items-end gap-1.5">
								<div class="text-right">
									<p class="text-xs text-ctp-subtext0">Sisa</p>
									<span
										class="num whitespace-nowrap text-sm font-bold tabular-nums
										{d.remaining === 0
										? 'text-ctp-green'
										: 'text-ctp-text'}"
									>
										{formatIDR(d.remaining)}
									</span>
								</div>
								<div class="flex gap-1">
									{#if d.remaining > 0}
										<button onclick={() => openPay(d)} class="btn btn-primary px-2.5 py-1 text-xs">
											Bayar
										</button>
									{/if}
									<button
										onclick={() => (deleteTarget = d)}
										aria-label="Hapus catatan hutang {d.person}"
										class="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red"
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
<ModalShell open={showCreate} labelledby="debt-form-title" onClose={() => (showCreate = false)}>
	<div class="flex items-center justify-between">
		<div>
			<h2 id="debt-form-title" class="font-semibold">Catat Utang</h2>
			<p class="text-xs text-ctp-subtext0">Catat utang kamu atau piutang orang lain</p>
		</div>
		<button class="btn btn-ghost p-1.5" aria-label="Tutup dialog" disabled={createSubmitting} onclick={() => (showCreate = false)}>
			<X size={18} />
		</button>
	</div>

			<form method="POST" action="?/create" use:enhance={handleCreate} novalidate class="space-y-4">
				<div>
					<label for="debt-person" class="label">Nama</label>
					<input
						id="debt-person"
						name="person"
						type="text"
						required
						maxlength={60}
						placeholder="cth. Budi, Ibu Sari"
						bind:value={person}
						aria-invalid={!!errors.person}
						class="input {errors.person ? 'border-ctp-red' : ''}"
					/>
					{#if errors.person}<p class="mt-1 text-xs text-ctp-red">{errors.person}</p>{/if}
				</div>

				<div>
					<span class="label">Arah</span>
					<input type="hidden" name="direction" value={direction} />
					<div class="grid grid-cols-2 gap-2" role="group" aria-label="Arah hutang">
						<button
							type="button"
							aria-pressed={direction === 'owe'}
							onclick={() => (direction = 'owe')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors
								{direction === 'owe'
								? 'border-ctp-red bg-ctp-red/10 text-ctp-red'
								: 'border-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface0 dark:border-ctp-surface1'}"
						>
							<TrendingDown size={14} /> Saya Berhutang
						</button>
						<button
							type="button"
							aria-pressed={direction === 'owed'}
							onclick={() => (direction = 'owed')}
							class="flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors
								{direction === 'owed'
								? 'border-ctp-green bg-ctp-green/10 text-ctp-green'
								: 'border-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface0 dark:border-ctp-surface1'}"
						>
							<TrendingUp size={14} /> Saya Meminjamkan
						</button>
					</div>
					{#if errors.direction}<p class="mt-1 text-xs text-ctp-red">{errors.direction}</p>{/if}
				</div>

				<div>
					<div class="mb-1 flex items-center justify-between">
						<label for="debt-amount" class="text-sm font-medium text-ctp-text">Jumlah (IDR)</label>
						{#if amount && Number(amount) > 0}
							<span class="num text-xs font-semibold tabular-nums text-ctp-subtext0">
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
						class="input num font-semibold tabular-nums {errors.amount ? 'border-ctp-red' : ''}"
					/>
					{#if errors.amount}<p class="mt-1 text-xs text-ctp-red">{errors.amount}</p>{/if}
					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each AMOUNT_PRESETS as [value, label] (label)}
							<button
								type="button"
								class="chip bg-ctp-surface0 text-ctp-subtext1 transition-colors hover:bg-ctp-surface1"
								onclick={() => addPreset(value)}
							>
								{label}
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label for="debt-date" class="label">Tanggal</label>
					<input
						id="debt-date"
						name="date"
						type="date"
						bind:value={date}
						aria-invalid={!!errors.date}
						class="input {errors.date ? 'border-ctp-red' : ''}"
					/>
					{#if errors.date}<p class="mt-1 text-xs text-ctp-red">{errors.date}</p>{/if}
				</div>

				<div class="space-y-2">
					<label for="debt-reduce" class="flex items-start gap-2 text-sm">
						<input
							id="debt-reduce"
							type="checkbox"
							name="reduceBalance"
							bind:checked={reduceBalance}
							class="mt-0.5 h-4 w-4 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1"
						/>
						<span>Langsung kurangi saldo dompet ini</span>
					</label>

					{#if reduceBalance}
						<div>
							<label for="debt-wallet" class="label">Dompet</label>
							<WalletSelect
								id="debt-wallet"
								name="walletId"
								bind:value={walletId}
								required
								invalid={!!errors.walletId}
								wallets={data.wallets}
							/>
							{#if errors.walletId}<p class="mt-1 text-xs text-ctp-red">{errors.walletId}</p>{/if}
						</div>
					{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button type="button" disabled={createSubmitting} onclick={() => (showCreate = false)} class="btn btn-outline px-4 py-2">
						Batal
					</button>
					<button type="submit" disabled={createSubmitting} class="btn btn-primary px-4 py-2">
						{createSubmitting ? 'Menyimpan…' : 'Catat'}
					</button>
				</div>
			</form>
</ModalShell>

<!-- Modal Bayar -->
<ModalShell open={!!payTarget} labelledby="pay-form-title" onClose={closePay}>
	<div class="flex items-center justify-between">
		<div>
			<h2 id="pay-form-title" class="font-semibold">Bayar — {payTarget?.person}</h2>
			<p class="text-xs text-ctp-subtext0">
				{payTarget?.direction === 'owe' ? 'Utang' : 'Piutang'} · {payTarget ? formatDate(payTarget.date) : ''}
			</p>
		</div>
		<button class="btn btn-ghost p-1.5" aria-label="Tutup dialog" disabled={paySubmitting} onclick={closePay}>
			<X size={18} />
		</button>
	</div>

	{#if payTarget}
			{#if payError}
				<p
					class="rounded-lg border border-ctp-red/40 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
					role="alert"
				>
					{payError}
				</p>
			{/if}

			<form method="POST" action="?/pay" use:enhance={handlePay} novalidate class="space-y-4">
				<input type="hidden" name="debtId" value={payTarget.id} />

				<div>
					<div class="mb-1 flex items-center justify-between">
						<label for="pay-amount" class="text-sm font-medium text-ctp-text">Jumlah (IDR)</label>
						<span class="num text-xs tabular-nums text-ctp-subtext0">Sisa: {formatIDR(payTarget.remaining)}</span>
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
						class="input num font-semibold tabular-nums {payErrors.amount ? 'border-ctp-red' : ''}"
					/>
					{#if payErrors.amount}<p class="mt-1 text-xs text-ctp-red">{payErrors.amount}</p>{/if}
				</div>

				<div>
					<label for="pay-wallet" class="label">Dompet</label>
					<WalletSelect
						id="pay-wallet"
						name="walletId"
						bind:value={payWalletId}
						required
						invalid={!!payErrors.walletId}
						wallets={data.wallets}
					/>
					{#if payErrors.walletId}<p class="mt-1 text-xs text-ctp-red">{payErrors.walletId}</p>{/if}
				</div>

				<div>
					<label for="pay-date" class="label">Tanggal</label>
					<input
						id="pay-date"
						name="date"
						type="date"
						bind:value={payDate}
						aria-invalid={!!payErrors.date}
						class="input {payErrors.date ? 'border-ctp-red' : ''}"
					/>
					{#if payErrors.date}<p class="mt-1 text-xs text-ctp-red">{payErrors.date}</p>{/if}
				</div>

				<div class="flex justify-end gap-2">
					<button type="button" disabled={paySubmitting} onclick={closePay} class="btn btn-outline px-4 py-2">
						Batal
					</button>
					<button type="submit" disabled={paySubmitting} class="btn btn-primary px-4 py-2">
						{paySubmitting ? 'Menyimpan…' : 'Bayar'}
					</button>
				</div>
			</form>
	{/if}
</ModalShell>

<ConfirmModal
	open={!!deleteTarget}
	title="Hapus Catatan Hutang"
	message={deleteTarget
		? deleteTarget.paid > 0
			? `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(deleteTarget.amount)})? Catatan ini punya pembayaran tercatat ${formatIDR(deleteTarget.paid)}. Riwayat hutang dihapus, tapi transaksi dompet yang sudah tercatat tetap tersimpan.`
			: `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(deleteTarget.amount)})? Tindakan ini tidak bisa dibatalkan.`
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
	title="Hapus Catatan Terpilih"
	message={`Hapus ${selectedCount} catatan hutang terpilih? Riwayat hutang dihapus, tapi transaksi dompet yang sudah tercatat tetap tersimpan.`}
	confirmText={bulkDeleting ? 'Menghapus…' : 'Hapus'}
	onConfirm={() => bulkForm?.requestSubmit()}
	onCancel={() => (showBulkConfirm = false)}
/>

<form method="POST" action="?/bulkDelete" bind:this={bulkForm} use:enhance={handleBulkDelete} class="hidden">
	<input type="hidden" name="ids" value={[...selected].join(',')} />
</form>
