<script lang="ts">
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	let { data, children } = $props();
</script>

{#if data.session}
	<Navigation />
	<!-- Wrapper (not <main>: pages render their own <main>). Sidebar offset on md+, bottom-nav padding on mobile. -->
	<div class="min-h-screen pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
<Toast />
