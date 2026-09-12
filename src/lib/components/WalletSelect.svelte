<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import type { WalletRow } from '$lib/server/db';

	type WalletItem = Pick<WalletRow, 'id' | 'name' | 'kind'>;

	interface Props extends HTMLSelectAttributes {
		wallets?: WalletItem[];
		name?: string;
		value?: string;
		id?: string;
		excludeId?: string;
		invalid?: boolean;
		required?: boolean;
		placeholder?: string;
		placeholderDisabled?: boolean;
		className?: string;
	}

	let {
		wallets = [],
		name,
		value = $bindable(''),
		id,
		excludeId,
		invalid = false,
		required = false,
		placeholder = 'Pilih dompet',
		placeholderDisabled = true,
		className = '',
		...restProps
	}: Props = $props();
</script>

<select
	{id}
	{name}
	bind:value
	{required}
	aria-invalid={invalid ? 'true' : undefined}
	class="input {invalid ? 'border-red-400 dark:border-red-500' : ''} {className}"
	{...restProps}
>
	{#if placeholder}
		<option value="" disabled={placeholderDisabled}>{placeholder}</option>
	{/if}
	{#each ['digital', 'cash'] as const as kind (kind)}
		{@const group = wallets.filter((w) => w.kind === kind && (!excludeId || w.id !== excludeId))}
		{#if group.length > 0}
			<optgroup label={kind === 'digital' ? 'Digital' : 'Tunai'}>
				{#each group as w (w.id)}
					<option value={w.id}>{w.name}</option>
				{/each}
			</optgroup>
		{/if}
	{/each}
</select>

