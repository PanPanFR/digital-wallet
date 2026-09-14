<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status} · Digital Wallet</title>
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
	<p class="num text-5xl font-bold tabular-nums text-ctp-overlay0 sm:text-6xl">{page.status}</p>
	<h1 class="text-xl font-semibold text-ctp-text">
		{page.status === 404 ? 'Halaman tidak ditemukan' : 'Terjadi kesalahan'}
	</h1>
	{#if page.error?.message}
		<p class="max-w-md text-sm text-ctp-subtext0">{page.error.message}</p>
	{/if}
	<a
		href="/"
		class="btn btn-primary mt-2 px-4 py-2"
	>
		Kembali ke Beranda
	</a>
</main>
