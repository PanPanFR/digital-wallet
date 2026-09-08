<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { data, form } = $props();
	let submitting = $state(false);
	const changed = $derived(page.url.searchParams.get('changed') === '1');
</script>

<svelte:head>
	<title>Pengaturan · Digital Wallet</title>
</svelte:head>

<main class="min-h-screen p-4 max-w-md mx-auto space-y-6">
	<header>
		<h1 class="text-2xl font-semibold">Pengaturan</h1>
		<p class="text-sm text-gray-500 dark:text-gray-400">Ubah master password.</p>
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
</main>
