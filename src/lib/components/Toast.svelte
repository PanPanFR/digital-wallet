<script lang="ts">
	import { toasts, removeToast } from '$lib/stores.svelte';
</script>

<div class="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">
	{#each toasts as toast (toast.id)}
		<div
			role="status"
			class="flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm text-white max-w-xs
				{toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}"
		>
			<span>{toast.message}</span>
			<button
				class="opacity-70 hover:opacity-100 shrink-0"
				aria-label="Tutup notifikasi"
				onclick={() => removeToast(toast.id)}
			>
				✕
			</button>
		</div>
	{/each}
</div>
