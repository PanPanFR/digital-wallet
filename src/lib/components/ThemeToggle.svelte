<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';

	let dark = $state(false);

	$effect(() => {
		// Script in app.html already applied the class before paint; just read it.
		dark = document.documentElement.classList.contains('dark');
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('ft-theme', dark ? 'dark' : 'light');
		} catch {
			// Private browsing may block storage; theme still applies for this visit
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
	aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
	aria-pressed={dark}
	title={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
>
	{#if dark}
		<Moon size={18} />
	{:else}
		<Sun size={18} />
	{/if}
</button>
