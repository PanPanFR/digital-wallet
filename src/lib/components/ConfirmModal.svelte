<script lang="ts">
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
	<div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onclick={onCancel}>
		<div
			class="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-5 space-y-4"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			use:modalAccessibility={{ onClose: onCancel }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between">
				<h3 class="font-semibold">{title}</h3>
				<button class="opacity-60 hover:opacity-100" aria-label="Tutup dialog" onclick={onCancel}>
					✕
				</button>
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-300">{message}</p>
			<div class="flex justify-end gap-2">
				<button
					class="rounded px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
					onclick={onCancel}
				>
					{cancelText}
				</button>
				<button
					class="rounded px-3 py-1.5 text-sm text-white
						{destructive ? 'bg-red-600 hover:bg-red-500' : 'bg-sky-600 hover:bg-sky-500'}"
					onclick={onConfirm}
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
