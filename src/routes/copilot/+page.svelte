<script lang="ts">
	import { Sparkles, Send, Loader2, RotateCcw } from '@lucide/svelte';

	type ChatItem = { role: 'user' | 'assistant'; content: string; error?: boolean };
	type ProviderSummary = { id: string; name: string; model: string; models: string[] };

	let { data } = $props();

	let chat = $state<ChatItem[]>([]);
	let question = $state('');
	let lastQuestion = $state('');
	let asking = $state(false);
	let scrollBox: HTMLDivElement | undefined = $state();

	const providers = $derived((data.providers as ProviderSummary[]) ?? []);
	const activeProviderId = $derived((data.activeProviderId as string) ?? '');

	// Selections default to the active provider; fall back to the first provider.
	let providerId = $state('');
	const provider = $derived(providers.find((p) => p.id === providerId) ?? null);
	let model = $state('');

	$effect(() => {
		if (!providerId && providers.length > 0) {
			providerId = activeProviderId && providers.some((p) => p.id === activeProviderId) ? activeProviderId : providers[0].id;
		}
	});
	// Keep model in sync when the provider or its stored default changes.
	$effect(() => {
		if (provider && !provider.models.includes(model)) model = provider.model;
	});

	const historyForApi = $derived(
		chat
			.filter((m) => !m.error)
			.slice(-8)
			.map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
	);

	async function ask(q?: string) {
		const text = (q ?? question).trim();
		if (!text || asking) return;
		const prior = historyForApi;
		chat.push({ role: 'user', content: text });
		lastQuestion = text;
		question = '';
		asking = true;
		try {
			const res = await fetch('/api/ai/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					question: text,
					history: prior,
					providerId: providerId || undefined,
					model: model || undefined
				})
			});
			const data = (await res.json()) as { answer?: string; error?: string };
			if (!res.ok) throw new Error(data.error ?? 'Gagal mendapatkan jawaban');
			chat.push({ role: 'assistant', content: data.answer ?? '(Jawaban kosong)' });
		} catch (e) {
			chat.push({
				role: 'assistant',
				content: e instanceof Error ? e.message : 'Terjadi kesalahan',
				error: true
			});
		} finally {
			asking = false;
		}
	}

	$effect(() => {
		if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;
	});
</script>

<svelte:head>
	<title>Copilot · Digital Wallet</title>
</svelte:head>

<main class="mx-auto flex h-[calc(100dvh-7rem)] max-w-2xl flex-col px-4 pb-4 pt-6">
	<h1 class="page-title mb-1 flex items-center gap-2">
		<Sparkles size={20} class="text-orange-600 dark:text-orange-400" /> Copilot
	</h1>

	{#if providers.length > 0}
		<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
			<label class="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
				<span class="text-xs">AI</span>
				<select
					bind:value={providerId}
					disabled={asking || providers.length < 2}
					class="input w-auto px-2 py-1 disabled:opacity-50"
				>
					{#each providers as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</label>
			{#if provider}
				<label class="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
					<span class="text-xs">Model</span>
					<select
						bind:value={model}
						disabled={asking || provider.models.length < 2}
						class="input w-auto px-2 py-1 disabled:opacity-50"
					>
						{#each provider.models as m (m)}
							<option value={m}>{m}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
	{/if}

	<div class="flex min-h-0 flex-1 flex-col">
		<div class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3" bind:this={scrollBox}>
			{#if chat.length === 0}
				<div class="flex flex-col items-center gap-4 py-10 text-center">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
					>
						<Sparkles size={24} />
					</div>
					<p class="text-sm text-slate-500 dark:text-slate-400">
						Tanya apa saja tentang keuanganmu.
					</p>
					<div class="flex flex-wrap justify-center gap-2">
						{#each [
							'Berapa pengeluaran hari ini?',
							'Ada utang apa saja?',
							'Pengeluaran terbesar bulan ini?'
						] as ex (ex)}
							<button
								onclick={() => ask(ex)}
								disabled={asking}
								class="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700 transition-colors hover:bg-orange-100 disabled:opacity-50 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900"
							>
								{ex}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#each chat as msg, i (i)}
				<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm
						{msg.role === 'user'
							? 'bg-orange-600 text-white'
							: msg.error
								? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
								: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'}"
					>
						{msg.content}
						{#if msg.error}
							<div>
								<button
									class="mt-1 inline-flex items-center gap-1 text-xs font-medium underline text-orange-700 transition-colors hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
									onclick={() => ask(lastQuestion)}
									disabled={asking}
								>
									<RotateCcw size={11} /> Coba lagi
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}

			{#if asking}
				<div class="flex justify-start">
					<div class="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
						<Loader2 size={14} class="inline animate-spin" /> Sedang menganalisis...
					</div>
				</div>
			{/if}
		</div>

		<form
			class="flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-800"
			onsubmit={(e) => {
				e.preventDefault();
				ask();
			}}
		>
			<input
				type="text"
				bind:value={question}
				placeholder="cth. Berapa pengeluaran hari ini? Ada utang apa saja?"
				maxlength="500"
				disabled={asking}
				aria-label="Pertanyaan"
				class="input flex-1"
			/>
			<button
				type="submit"
				disabled={asking || !question.trim()}
				aria-label="Kirim pertanyaan"
				class="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-orange-600 text-white transition-colors hover:bg-orange-700 disabled:pointer-events-none disabled:opacity-50"
			>
				<Send size={16} />
			</button>
		</form>
	</div>
</main>
