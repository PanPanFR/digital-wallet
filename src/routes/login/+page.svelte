<script lang="ts">
	import { enhance } from '$app/forms';
	import { Wallet } from '@lucide/svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{data.mode === 'setup' ? 'Atur Password' : 'Login'} · Digital Wallet</title>
</svelte:head>

<main class="min-h-screen flex items-center justify-center px-4">
	<div class="card w-full max-w-sm p-6 space-y-4">
		<div class="flex flex-col items-center gap-2 text-center space-y-1">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white shadow-xs">
				<Wallet size={22} />
			</div>
			<h1 class="text-xl font-semibold text-slate-900 dark:text-white">Digital Wallet</h1>
			<p class="text-sm text-slate-500 dark:text-slate-400">
				{data.mode === 'setup' ? 'Atur master password' : 'Masuk untuk melanjutkan'}
			</p>
		</div>

		{#if data.mode === 'setup'}
			<p class="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
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
				<span class="label">Password</span>
				<input
					name="password"
					type="password"
					required
					minlength="8"
					autocomplete={data.mode === 'setup' ? 'new-password' : 'current-password'}
					class="input"
				/>
			</label>

			{#if form?.error}
				<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="btn btn-primary w-full py-2"
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
