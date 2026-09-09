<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { X } from '@lucide/svelte';
	import { modalAccessibility } from '$lib/modalAccessibility';

	let {
		open,
		title = 'Konfirmasi',
		message,
		confirmText = 'Hapus',
		cancelText = 'Batal',
		destructive = true,
		onConfirm,
		onCancel
	}: {
		open: boolean;
		title?: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		destructive?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
		transition:fade={{ duration: prefersReducedMotion.current ? 0 : 120 }}
		onclick={onCancel}
	>
		<div
			class="w-full max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 p-5 space-y-4"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			use:modalAccessibility={{ onClose: onCancel }}
			transition:scale={{ start: 0.96, duration: prefersReducedMotion.current ? 0 : 140 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between">
				<h3 class="font-semibold">{title}</h3>
				<button class="btn-ghost p-1.5" aria-label="Tutup dialog" onclick={onCancel}>
					<X size={18} />
				</button>
			</div>
			<p class="text-sm text-slate-600 dark:text-slate-300">{message}</p>
			<div class="flex justify-end gap-2">
				<button class="btn-outline px-3 py-2" onclick={onCancel}>
					{cancelText}
				</button>
				<button
					class="px-3 py-2 {destructive ? 'btn-danger' : 'btn-primary'}"
					onclick={onConfirm}
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
