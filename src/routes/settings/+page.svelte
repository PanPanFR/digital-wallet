<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Pencil, Trash2, Plus, Sparkles, CheckCircle2, TriangleAlert } from '@lucide/svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { notify } from '$lib/stores.svelte';

	type ProviderSummary = { id: string; name: string; baseUrl: string; model: string; models: string[] };

	let { data, form } = $props();
	let submitting = $state(false);
	const providers = $derived((data.providers as ProviderSummary[]) ?? []);
	const activeId = $derived((data.activeProviderId as string) ?? '');
	const changed = $derived(page.url.searchParams.get('changed') === '1');

	// Add form state
	let addName = $state('');
	let addBaseUrl = $state('');
	let addApiKey = $state('');
	let addModels = $state('');
	let addErrors = $state<Record<string, string>>({});
	let adding = $state(false);

	// Edit state
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editBaseUrl = $state('');
	let editApiKey = $state('');
	let editModels = $state('');
	let editErrors = $state<Record<string, string>>({});

	let listError = $state('');
	let deleteTarget = $state<ProviderSummary | null>(null);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = null;

	// Backup import state
	let importError = $state('');
	let importErrors = $state<Record<string, string>>({});
	let importSummary = $state('');
	let importing = $state(false);
	let importConfirmOpen = $state(false);
	let importForm: HTMLFormElement | null = null;

	function resetAdd() {
		addName = '';
		addBaseUrl = '';
		addApiKey = '';
		addModels = '';
		addErrors = {};
		adding = false;
	}

	const handleAdd: SubmitFunction = () => {
		adding = true;
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data) {
				addErrors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				adding = false;
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Provider AI ditambahkan');
				resetAdd();
			} else {
				adding = false;
			}
		};
	};

	function openEdit(p: ProviderSummary) {
		editingId = p.id;
		editName = p.name;
		editBaseUrl = p.baseUrl;
		editApiKey = '';
		editModels = p.models.join(', ');
		editErrors = {};
		listError = '';
	}

	const handleUpdate: SubmitFunction = () => {
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data) {
				editErrors = (result.data as { errors?: Record<string, string> }).errors ?? {};
				return;
			}
			await update();
			if (result.type === 'success') {
				notify('success', 'Provider AI diperbarui');
				editingId = null;
			}
		};
	};

	const handleSetActive: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'success') notify('success', 'Provider aktif diubah');
			else if (result.type === 'failure' && result.data) {
				listError = (result.data as { error?: string }).error ?? 'Gagal mengubah provider aktif';
			}
		};
	};

	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			deleting = false;
			deleteTarget = null;
			await update();
			if (result.type === 'success') notify('success', 'Provider AI dihapus');
			else if (result.type === 'failure' && result.data) {
				listError = (result.data as { error?: string }).error ?? 'Gagal menghapus provider';
			}
		};
	};

	const handleImport: SubmitFunction = () => {
		importing = true;
		return async ({ result, update }) => {
			importing = false;
			importConfirmOpen = false;
			if (result.type === 'failure' && result.data) {
				const data = result.data as {
					importError?: string;
					importErrors?: Record<string, string>;
				};
				importError = data.importError ?? '';
				importErrors = data.importErrors ?? {};
				importSummary = '';
				return;
			}
			await update();
			if (result.type === 'success' && result.data) {
				const data = result.data as {
					inserted?: Record<string, number>;
					skipped?: Record<string, number>;
				};
				const x = Object.values(data.inserted ?? {}).reduce((a, b) => a + b, 0);
				const y = Object.values(data.skipped ?? {}).reduce((a, b) => a + b, 0);
				importSummary = `Impor selesai: ${x} baru, ${y} dilewati.`;
				importError = '';
				importErrors = {};
				importForm?.reset();
				notify('success', importSummary);
			}
		};
	};
</script>

<svelte:head>
	<title>Pengaturan · Digital Wallet</title>
</svelte:head>

<main class="mx-auto max-w-md space-y-6 px-4 py-6">
	<header>
		<h1 class="page-title">Pengaturan</h1>
		<p class="page-subtitle mt-0.5">Ubah password &amp; kelola penyedia AI.</p>
	</header>

	<section class="card space-y-4 p-4">
		<h2 class="section-title">Ubah Password</h2>

		{#if changed && !form?.error}
			<p
			class="rounded-lg border border-ctp-green/30 bg-ctp-green/10 px-3 py-2 text-sm text-ctp-green"
			role="status"
		>
			Password berhasil diubah.
		</p>
		{/if}

		<form
			method="POST"
			action="?/change-password"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="space-y-3"
		>
			<label class="block text-sm">
				<span class="label">Password saat ini</span>
				<input
					name="current"
					type="password"
					required
					autocomplete="current-password"
					class="input"
				/>
			</label>
			<label class="block text-sm">
				<span class="label">Password baru (min. 8 karakter)</span>
				<input
					name="next"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="input"
				/>
			</label>
			<label class="block text-sm">
				<span class="label">Konfirmasi password baru</span>
				<input
					name="confirm"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="input"
				/>
			</label>

		{#if form?.error}
			<p
				class="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
				role="alert"
			>
				{form.error}
			</p>
		{/if}

			<button
				type="submit"
				disabled={submitting}
				class="btn btn-primary w-full"
			>
				{submitting ? 'Menyimpan…' : 'Simpan Password'}
			</button>
		</form>
	</section>

	<section class="card space-y-4 p-4">
		<h2 class="section-title flex items-center gap-1.5">
			<Sparkles size={16} class="text-ctp-peach" /> AI / Copilot
		</h2>
		<p class="text-sm text-ctp-subtext0">
			Tambahkan penyedia OpenAI-compatible (base URL + API key). Tanpa penyedia, Copilot memakai
			konfigurasi server (GOOGLE_API_KEY). API key disimpan di database — jangan bagikan akun ini.
		</p>

	{#if listError}
		<p
			class="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
			role="alert"
		>
			{listError}
		</p>
	{/if}

		{#if providers.length === 0}
			<p class="text-sm text-ctp-subtext0">
				Belum ada penyedia. Tambahkan satu di bawah untuk memilih model dari halaman Copilot.
			</p>
		{:else}
			<ul class="divide-y divide-ctp-surface0 dark:divide-ctp-surface0">
				{#each providers as p (p.id)}
					<li class="py-3">
						{#if editingId === p.id}
							<form
								method="POST"
								action="?/save-provider"
							use:enhance={handleUpdate}
							class="space-y-3"
							>
								<input type="hidden" name="id" value={p.id} />
								<label class="block text-sm">
									<span class="label">Nama</span>
									<input
										name="name"
										bind:value={editName}
										required
										maxlength="50"
										class="input {editErrors.name ? 'border-ctp-red' : ''}"
									/>
								</label>
								<label class="block text-sm">
									<span class="label">Base URL</span>
									<input
										name="baseUrl"
										type="url"
										bind:value={editBaseUrl}
										placeholder="https://…/v1"
										required
										class="input {editErrors.baseUrl ? 'border-ctp-red' : ''}"
									/>
								</label>
								<label class="block text-sm">
									<span class="label">API key (kosongkan = tetap)</span>
									<input
										name="apiKey"
										type="password"
										bind:value={editApiKey}
										autocomplete="new-password"
										class="input {editErrors.apiKey ? 'border-ctp-red' : ''}"
									/>
								</label>
								<label class="block text-sm">
									<span class="label">Model (pisahkan dengan koma, yang pertama jadi default)</span>
									<textarea
										name="models"
										bind:value={editModels}
										required
										rows="2"
										class="input {editErrors.models ? 'border-ctp-red' : ''}"
									></textarea>
								</label>
								{#if Object.keys(editErrors).length > 0}
									<p class="text-xs text-ctp-red">
										{Object.values(editErrors)[0]}
									</p>
								{/if}
								<div class="flex justify-end gap-2">
									<button
										type="button"
										onclick={() => (editingId = null)}
										class="btn btn-outline px-3 py-1.5"
									>
										Batal
									</button>
									<button
										type="submit"
										class="btn btn-primary px-3 py-1.5"
									>
										Simpan
									</button>
								</div>
							</form>
						{:else}
							<div class="flex items-center gap-3">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">
										{p.name}
										{#if p.id === activeId}
											<span
												class="ml-1 inline-flex items-center gap-0.5 text-xs text-ctp-green"
											>
												<CheckCircle2 size={12} /> aktif
											</span>
										{/if}
									</p>
									<p class="truncate text-xs text-ctp-subtext0">
										{p.baseUrl}
									</p>
								</div>
								{#if p.id !== activeId}
									<form method="POST" action="?/set-active" use:enhance={handleSetActive}>
										<input type="hidden" name="id" value={p.id} />
										<button
											type="submit"
											title="Jadikan aktif"
											class="rounded-lg px-2 py-1.5 text-xs font-medium text-ctp-peach transition-colors hover:bg-ctp-peach/10"
										>
											Aktifkan
										</button>
									</form>
								{/if}
								<button
									type="button"
									onclick={() => openEdit(p)}
									title="Edit"
									class="btn btn-ghost rounded-lg p-1.5"
								>
									<Pencil size={15} />
								</button>
								<button
									type="button"
									onclick={() => (deleteTarget = p)}
									title="Hapus"
									class="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red"
								>
									<Trash2 size={15} />
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}

		<form
			method="POST"
			action="?/save-provider"
			use:enhance={handleAdd}
			class="space-y-3 border-t border-ctp-surface0 pt-4 dark:border-ctp-surface1"
		>
			<p class="text-sm font-medium">Tambah penyedia</p>
			<label class="block text-sm">
				<span class="label">Nama</span>
				<input
					name="name"
					bind:value={addName}
					required
					maxlength="50"
					placeholder="cth. 9router, OpenAI, Groq"
					class="input {addErrors.name ? 'border-ctp-red' : ''}"
				/>
			</label>
			<label class="block text-sm">
				<span class="label">Base URL</span>
				<input
					name="baseUrl"
					type="url"
					bind:value={addBaseUrl}
					placeholder="https://…/v1"
					required
					class="input {addErrors.baseUrl ? 'border-ctp-red' : ''}"
				/>
			</label>
			<label class="block text-sm">
				<span class="label">API key</span>
				<input
					name="apiKey"
					type="password"
					bind:value={addApiKey}
					autocomplete="new-password"
					required
					class="input {addErrors.apiKey ? 'border-ctp-red' : ''}"
				/>
			</label>
			<label class="block text-sm">
				<span class="label">Model (pisahkan dengan koma, yang pertama jadi default)</span>
				<textarea
					name="models"
					bind:value={addModels}
					required
					rows="2"
					placeholder="gemini-2.5-flash, gpt-4o-mini"
					class="input {addErrors.models ? 'border-ctp-red' : ''}"
				></textarea>
			</label>
			{#if Object.keys(addErrors).length > 0}
				<p class="text-xs text-ctp-red">{Object.values(addErrors)[0]}</p>
			{/if}
			<button
				type="submit"
				disabled={adding}
				class="btn btn-primary px-3 py-1.5"
			>
				<Plus size={14} /> {adding ? 'Menyimpan…' : 'Tambah Penyedia'}
			</button>
		</form>
	</section>

	<section class="card space-y-4 p-4">
		<h2 class="section-title">Data</h2>
		<div class="flex flex-wrap gap-2">
			<a class="btn btn-outline" href="/api/backup/export?format=json">Unduh Backup (JSON)</a>
			<a class="btn btn-outline" href="/api/backup/export?format=csv">Unduh Transaksi (CSV)</a>
		</div>
		<p class="notice-warn flex items-start gap-2 rounded-lg border border-ctp-yellow/30 bg-ctp-yellow/15 px-3 py-2 text-sm">
			<TriangleAlert size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
			<span>File backup berisi API key — simpan baik-baik.</span>
		</p>

		{#if importSummary}
			<p
				class="rounded-lg border border-ctp-green/30 bg-ctp-green/10 px-3 py-2 text-sm text-ctp-green"
				role="status"
			>
				{importSummary}
			</p>
		{/if}
		{#if importError}
			<p
				class="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
				role="alert"
			>
				{importError}
			</p>
		{/if}
		{#if Object.keys(importErrors).length > 0}
			<p class="text-xs text-ctp-red">{Object.values(importErrors)[0]}</p>
		{/if}

		<form
			method="POST"
			action="?/import-backup"
			enctype="multipart/form-data"
			bind:this={importForm}
			use:enhance={handleImport}
			class="space-y-3"
		>
			<label class="block text-sm">
				<span class="label">File backup (JSON)</span>
				<input
					name="file"
					type="file"
					accept="application/json"
					required
					class="input"
				/>
			</label>
			<button
				type="button"
				onclick={() => (importConfirmOpen = true)}
				disabled={importing}
				class="btn btn-primary px-3 py-1.5"
			>
				{importing ? 'Mengimpor…' : 'Impor Backup'}
			</button>
		</form>
	</section>

	<section class="card space-y-4 p-4">
		<h2 class="section-title">Sesi</h2>
		<form method="POST" action="/?/logout">
			<button
				type="submit"
				class="btn btn-danger w-full py-2"
			>
				Keluar
			</button>
		</form>
	</section>
</main>

<ConfirmModal
	open={!!deleteTarget}
	title="Hapus Provider"
	message={deleteTarget ? `Hapus "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.` : ''}
	confirmText={deleting ? 'Menghapus…' : 'Hapus'}
	onConfirm={() => deleteForm?.requestSubmit()}
	onCancel={() => (deleteTarget = null)}
/>

<form method="POST" action="?/delete-provider" bind:this={deleteForm} use:enhance={handleDelete} class="hidden">
	<input type="hidden" name="id" value={deleteTarget?.id ?? ''} />
</form>

<ConfirmModal
	open={importConfirmOpen}
	title="Impor Backup"
	message="Impor backup? Data yang sudah ada tidak akan dihapus."
	confirmText={importing ? 'Mengimpor…' : 'Impor'}
	destructive={false}
	onConfirm={() => importForm?.requestSubmit()}
	onCancel={() => (importConfirmOpen = false)}
/>
