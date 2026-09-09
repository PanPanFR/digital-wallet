<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Pencil, Trash2, Plus, Sparkles, CheckCircle2 } from '@lucide/svelte';
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
</script>

<svelte:head>
	<title>Pengaturan · Digital Wallet</title>
</svelte:head>

<main class="min-h-screen p-4 max-w-md mx-auto space-y-6">
	<header>
		<h1 class="text-2xl font-semibold">Pengaturan</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400">Ubah password &amp; kelola penyedia AI.</p>
	</header>

	<section class="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 space-y-4">
		<h2 class="font-medium">Ubah Password</h2>

		{#if changed && !form?.error}
			<p class="text-sm text-green-600 dark:text-green-400">Password berhasil diubah.</p>
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
				<span class="text-gray-700 dark:text-gray-300">Password saat ini</span>
				<input
					name="current"
					type="password"
					required
					autocomplete="current-password"
					class="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-gray-700 dark:text-gray-300">Password baru (min. 8 karakter)</span>
				<input
					name="next"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-gray-700 dark:text-gray-300">Konfirmasi password baru</span>
				<input
					name="confirm"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="mt-1 w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
				/>
			</label>

			{#if form?.error}
				<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-medium py-2 transition"
			>
				{submitting ? 'Menyimpan…' : 'Simpan Password'}
			</button>
		</form>
	</section>

	<section class="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 space-y-4">
		<h2 class="font-medium flex items-center gap-1.5">
			<Sparkles size={16} class="text-sky-500" /> AI / Copilot
		</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			Tambahkan penyedia OpenAI-compatible (base URL + API key). Tanpa penyedia, Copilot memakai
			konfigurasi server (GOOGLE_API_KEY). API key disimpan di database — jangan bagikan akun ini.
		</p>

		{#if listError}
			<p class="text-sm text-red-600 dark:text-red-400">{listError}</p>
		{/if}

		{#if providers.length === 0}
			<p class="text-sm text-gray-500 dark:text-gray-400">
				Belum ada penyedia. Tambahkan satu di bawah untuk memilih model dari halaman Copilot.
			</p>
		{:else}
			<ul class="divide-y divide-gray-100 dark:divide-gray-800">
				{#each providers as p (p.id)}
					<li class="py-3">
						{#if editingId === p.id}
							<form
								method="POST"
								action="?/save-provider"
								use:enhance={handleUpdate}
								class="space-y-2"
							>
								<input type="hidden" name="id" value={p.id} />
								<label class="block text-sm">
									<span>Nama</span>
									<input
										name="name"
										bind:value={editName}
										required
										maxlength="50"
										class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {editErrors.name
											? 'border-red-400'
											: 'border-gray-300 dark:border-gray-700'}"
									/>
								</label>
								<label class="block text-sm">
									<span>Base URL</span>
									<input
										name="baseUrl"
										type="url"
										bind:value={editBaseUrl}
										placeholder="https://…/v1"
										required
										class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {editErrors.baseUrl
											? 'border-red-400'
											: 'border-gray-300 dark:border-gray-700'}"
									/>
								</label>
								<label class="block text-sm">
									<span>API key (kosongkan = tetap)</span>
									<input
										name="apiKey"
										type="password"
										bind:value={editApiKey}
										autocomplete="new-password"
										class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {editErrors.apiKey
											? 'border-red-400'
											: 'border-gray-300 dark:border-gray-700'}"
									/>
								</label>
								<label class="block text-sm">
									<span>Model (pisahkan dengan koma, yang pertama jadi default)</span>
									<textarea
										name="models"
										bind:value={editModels}
										required
										rows="2"
										class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {editErrors.models
											? 'border-red-400'
											: 'border-gray-300 dark:border-gray-700'}"
									></textarea>
								</label>
								{#if Object.keys(editErrors).length > 0}
									<p class="text-xs text-red-600 dark:text-red-400">
										{Object.values(editErrors)[0]}
									</p>
								{/if}
								<div class="flex justify-end gap-2">
									<button
										type="button"
										onclick={() => (editingId = null)}
										class="rounded border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm"
									>
										Batal
									</button>
									<button
										type="submit"
										class="rounded bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-sm font-medium text-white"
									>
										Simpan
									</button>
								</div>
							</form>
						{:else}
							<div class="flex items-center gap-2">
								<div class="min-w-0 flex-1">
									<p class="truncate text-sm font-medium">
										{p.name}
										{#if p.id === activeId}
											<span
												class="ml-1 inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400"
											>
												<CheckCircle2 size={12} /> aktif
											</span>
										{/if}
									</p>
									<p class="truncate text-xs text-gray-500 dark:text-gray-400">
										{p.baseUrl}
									</p>
								</div>
								{#if p.id !== activeId}
									<form method="POST" action="?/set-active" use:enhance={handleSetActive}>
										<input type="hidden" name="id" value={p.id} />
										<button
											type="submit"
											title="Jadikan aktif"
											class="rounded px-2 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
										>
											Aktifkan
										</button>
									</form>
								{/if}
								<button
									type="button"
									onclick={() => openEdit(p)}
									title="Edit"
									class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600 dark:hover:bg-gray-800"
								>
									<Pencil size={15} />
								</button>
								<button
									type="button"
									onclick={() => (deleteTarget = p)}
									title="Hapus"
									class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
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
			class="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800"
		>
			<p class="text-sm font-medium">Tambah penyedia</p>
			<label class="block text-sm">
				<span>Nama</span>
				<input
					name="name"
					bind:value={addName}
					required
					maxlength="50"
					placeholder="cth. 9router, OpenAI, Groq"
					class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {addErrors.name
						? 'border-red-400'
						: 'border-gray-300 dark:border-gray-700'}"
				/>
			</label>
			<label class="block text-sm">
				<span>Base URL</span>
				<input
					name="baseUrl"
					type="url"
					bind:value={addBaseUrl}
					placeholder="https://…/v1"
					required
					class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {addErrors.baseUrl
						? 'border-red-400'
						: 'border-gray-300 dark:border-gray-700'}"
				/>
			</label>
			<label class="block text-sm">
				<span>API key</span>
				<input
					name="apiKey"
					type="password"
					bind:value={addApiKey}
					autocomplete="new-password"
					required
					class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {addErrors.apiKey
						? 'border-red-400'
						: 'border-gray-300 dark:border-gray-700'}"
				/>
			</label>
			<label class="block text-sm">
				<span>Model (pisahkan dengan koma, yang pertama jadi default)</span>
				<textarea
					name="models"
					bind:value={addModels}
					required
					rows="2"
					placeholder="gemini-2.5-flash, gpt-4o-mini"
					class="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-white dark:bg-gray-950 {addErrors.models
						? 'border-red-400'
						: 'border-gray-300 dark:border-gray-700'}"
				></textarea>
			</label>
			{#if Object.keys(addErrors).length > 0}
				<p class="text-xs text-red-600 dark:text-red-400">{Object.values(addErrors)[0]}</p>
			{/if}
			<button
				type="submit"
				disabled={adding}
				class="inline-flex items-center gap-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white"
			>
				<Plus size={14} /> {adding ? 'Menyimpan…' : 'Tambah Penyedia'}
			</button>
		</form>
	</section>

	<section class="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 space-y-4">
		<h2 class="font-medium">Sesi</h2>
		<form method="POST" action="/?/logout">
			<button
				type="submit"
				class="w-full rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-medium py-2"
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
