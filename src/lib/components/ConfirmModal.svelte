<script lang="ts">
	import { X } from '@lucide/svelte';
	import ModalShell from '$lib/components/ModalShell.svelte';

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

<ModalShell {open} {title} width="max-w-sm" onClose={onCancel}>
	<div class="flex items-center justify-between">
		<h3 class="font-semibold">{title}</h3>
		<button class="btn btn-ghost p-1.5" aria-label="Tutup dialog" onclick={onCancel}>
			<X size={18} />
		</button>
	</div>
	<p class="text-sm text-ctp-subtext1">{message}</p>
	<div class="flex justify-end gap-2">
		<button class="btn btn-outline px-3 py-2" onclick={onCancel}>
			{cancelText}
		</button>
		<button
			class="btn px-3 py-2 {destructive ? 'btn-danger' : 'btn-primary'}"
			onclick={onConfirm}
		>
			{confirmText}
		</button>
	</div>
</ModalShell>
