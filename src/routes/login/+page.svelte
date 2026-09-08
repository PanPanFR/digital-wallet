<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{data.mode === 'setup' ? 'Atur Password' : 'Login'} · Digital Wallet</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center px-4">
	<div class="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 space-y-4">
		<div class="text-center space-y-1">
			<h1 class="text-xl font-semibold">Digital Wallet</h1>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{data.mode === 'setup' ? 'Atur master password' : 'Masuk untuk melanjutkan'}
			</p>
		</div>

		{#if data.mode === 'setup'}
			<p class="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
				Ini pertama kalinya. Atur master password (min. 8 karakter). Password ini akan
				digunakan untuk masuk ke aplikasi.
			</p>
		{/if}

		<form
			method="POST"
			action={data.mode === 'setup' ? '?/setup' : '?/login'}
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
				<span class="text-gray-700 dark:text-gray-300">Password</span>
				<input
					name="password"
					type="password"
					required
					minlength="8"
					autocomplete={data.mode === 'setup' ? 'new-password' : 'current-password'}
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
				{submitting
					? 'Memproses…'
					: data.mode === 'setup'
						? 'Atur & Masuk'
						: 'Masuk'}
			</button>
		</form>
	</div>
</main>
