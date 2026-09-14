<script lang="ts">
	import { enhance } from '$app/forms';
	import { Wallet, CircleAlert } from '@lucide/svelte';

	let { data, form } = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{data.mode === 'setup' ? 'Atur Password' : 'Login'} · Digital Wallet</title>
</svelte:head>

<main class="flex min-h-screen items-center justify-center bg-ctp-crust px-4 dark:bg-ctp-crust">
	<div class="card w-full max-w-sm space-y-4 p-6">
		<div class="flex flex-col items-center gap-2 text-center">
			<div class="tile h-10 w-10 bg-ctp-peach text-white shadow-xs dark:text-ctp-crust">
				<Wallet size={22} />
			</div>
			<h1 class="page-title">Digital Wallet</h1>
			<p class="text-sm text-ctp-subtext0">
				{data.mode === 'setup' ? 'Atur master password' : 'Masuk untuk melanjutkan'}
			</p>
		</div>

		{#if data.mode === 'setup'}
			<p class="rounded-lg border border-ctp-surface0 bg-ctp-surface0/50 p-3 text-xs text-ctp-subtext1 dark:border-ctp-surface1">
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
			<p
				class="flex items-start gap-2 rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
				role="alert"
			>
				<CircleAlert size={16} class="mt-0.5 shrink-0" aria-hidden="true" />
				<span>{form.error}</span>
			</p>
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
