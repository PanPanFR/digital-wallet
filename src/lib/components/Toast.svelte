<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { X } from '@lucide/svelte';
	import { toasts, removeToast } from '$lib/stores.svelte';
</script>

<div class="fixed bottom-20 md:bottom-4 right-4 z-50 space-y-2" aria-live="polite">
	{#each toasts as toast (toast.id)}
		<div
			role="status"
			class="flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm text-white dark:text-ctp-crust max-w-xs
				{toast.type === 'success' ? 'bg-ctp-green' : 'bg-ctp-red'}"
			in:fly={{ x: 24, duration: prefersReducedMotion.current ? 0 : 150 }}
			out:fade={{ duration: prefersReducedMotion.current ? 0 : 100 }}
		>
			<span>{toast.message}</span>
			<button
				class="opacity-70 hover:opacity-100 shrink-0"
				aria-label="Tutup notifikasi"
				onclick={() => removeToast(toast.id)}
			>
				<X size={16} />
			</button>
		</div>
	{/each}
</div>
