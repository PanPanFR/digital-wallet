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
		<Sparkles size={20} class="text-ctp-peach" /> Copilot
	</h1>

	{#if providers.length > 0}
		<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
			<label class="flex items-center gap-1.5 text-ctp-subtext1">
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
				<label class="flex items-center gap-1.5 text-ctp-subtext1">
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
						class="flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-peach/15 text-ctp-peach"
					>
						<Sparkles size={24} />
					</div>
					<p class="text-sm text-ctp-subtext0">
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
								class="chip transition-colors hover:bg-ctp-surface0 disabled:opacity-50"
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
							? 'bg-ctp-peach/15 text-ctp-text'
							: msg.error
								? 'bg-ctp-red/10 text-ctp-red'
								: 'bg-ctp-surface0 text-ctp-text'}"
					>
						{msg.content}
						{#if msg.error}
							<div>
								<button
									class="mt-1 inline-flex items-center gap-1 text-xs font-medium underline text-ctp-peach transition-colors hover:text-ctp-maroon"
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
					<div class="rounded-xl bg-ctp-surface0 px-4 py-2.5 text-sm text-ctp-subtext0">
						<Loader2 size={14} class="inline animate-spin" /> Sedang menganalisis...
					</div>
				</div>
			{/if}
		</div>

		<form
			class="flex gap-2 border-t border-ctp-surface0 pt-3 dark:border-ctp-surface1"
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
				class="btn btn-primary h-[38px] w-[38px] shrink-0 rounded-full"
			>
				<Send size={16} />
			</button>
		</form>
	</div>
</main>
