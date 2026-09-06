<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Finance Tracker</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
	<p class="text-6xl font-bold text-sky-600 dark:text-sky-400">{page.status}</p>
	<h1 class="text-xl font-semibold">
		{page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
	</h1>
	{#if page.error?.message}
		<p class="text-sm text-gray-500 dark:text-gray-400">{page.error.message}</p>
	{/if}
	<a
		href="/"
		class="mt-2 rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700"
	>
		Kembali ke Beranda
	</a>
</main>
