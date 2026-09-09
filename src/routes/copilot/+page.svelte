<script lang="ts">
	import { Sparkles, Send, Loader2, RotateCcw } from '@lucide/svelte';

	type ChatItem = { role: 'user' | 'assistant'; content: string; error?: boolean };

	let chat = $state<ChatItem[]>([]);
	let question = $state('');
	let lastQuestion = $state('');
	let asking = $state(false);
	let scrollBox: HTMLDivElement | undefined = $state();

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
				body: JSON.stringify({ question: text, history: prior })
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
	<h1 class="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
		<Sparkles size={20} class="text-sky-600 dark:text-sky-400" /> Copilot
	</h1>

	<div class="flex min-h-0 flex-1 flex-col">
		<div class="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3" bind:this={scrollBox}>
			{#if chat.length === 0}
				<div class="flex flex-col items-center gap-4 py-10 text-center">
					<p class="text-sm text-gray-500 dark:text-gray-400">
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
								class="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700 transition hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300 dark:hover:bg-sky-900"
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
						class="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm
						{msg.role === 'user'
							? 'bg-sky-600 text-white'
							: msg.error
								? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
								: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'}"
					>
						{msg.content}
						{#if msg.error}
							<div>
								<button
									class="mt-1 inline-flex items-center gap-1 text-xs font-medium underline"
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
					<div class="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500 dark:bg-gray-800">
						<Loader2 size={14} class="inline animate-spin" /> Sedang menganalisis...
					</div>
				</div>
			{/if}
		</div>

		<form
			class="flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-800"
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
				class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
			/>
			<button
				type="submit"
				disabled={asking || !question.trim()}
				aria-label="Kirim pertanyaan"
				class="rounded-lg bg-sky-600 px-3 text-white transition hover:bg-sky-500 disabled:opacity-50"
			>
				<Send size={16} />
			</button>
		</form>
	</div>
</main>
