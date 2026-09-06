<script lang="ts">
	/**
	 * Loading placeholder mirroring the transaction row layout.
	 * `rows` controls how many placeholder rows render.
	 */
	let { rows = 3 }: { rows?: number } = $props();
</script>

<div role="status" aria-live="polite" aria-busy="true" class="space-y-2">
	<span class="sr-only">Memuat…</span>
	{#each Array.from({ length: rows }) as _, i (i)}
		<div
			class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
		>
			<div class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800"></div>
			<div class="min-w-0 flex-1 space-y-1.5">
				<div class="h-3 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
				<div class="h-3 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
			</div>
			<div class="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800"></div>
		</div>
	{/each}
</div>
