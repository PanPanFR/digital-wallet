<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { modalAccessibility } from '$lib/modalAccessibility';

	let {
		open = false,
		title,
		labelledby,
		onClose,
		width = 'max-w-md',
		children
	}: {
		open?: boolean;
		title?: string;
		labelledby?: string;
		onClose: () => void;
		width?: string;
		children?: Snippet;
	} = $props();
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
		transition:fade={{ duration: prefersReducedMotion.current ? 0 : 120 }}
		onclick={onClose}
	>
		<div
			class="card w-full {width} space-y-4 p-5 shadow-lg"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			aria-labelledby={labelledby}
			tabindex="-1"
			use:modalAccessibility={{ onClose }}
			transition:scale={{ start: 0.96, duration: prefersReducedMotion.current ? 0 : 140 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			{@render children?.()}
		</div>
	</div>
{/if}
