<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Digital Wallet</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
	<p class="text-6xl font-bold tabular-nums text-slate-400 dark:text-slate-500">{page.status}</p>
	<h1 class="text-xl font-semibold text-slate-900 dark:text-white">
		{page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
	</h1>
	{#if page.error?.message}
		<p class="text-sm text-slate-500 dark:text-slate-400">{page.error.message}</p>
	{/if}
	<a
		href="/"
		class="btn btn-primary mt-2 px-4 py-2"
	>
		Kembali ke Beranda
	</a>
</main>
