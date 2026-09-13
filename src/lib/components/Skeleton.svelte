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
			class="flex items-center gap-3 rounded-xl border border-ctp-surface0 bg-ctp-mantle px-4 py-3 dark:bg-ctp-base"
		>
			<div class="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-ctp-surface0"></div>
			<div class="min-w-0 flex-1 space-y-1.5">
				<div class="h-3 w-2/5 animate-pulse rounded bg-ctp-surface0"></div>
				<div class="h-3 w-1/4 animate-pulse rounded bg-ctp-surface0"></div>
			</div>
			<div class="h-3 w-20 animate-pulse rounded bg-ctp-surface0"></div>
		</div>
	{/each}
</div>
