<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { Sparkles, Send, Loader2, RotateCcw } from '@lucide/svelte';
	import { notify } from '$lib/stores.svelte';
	import { formatIDR } from '$lib/format';

	let { form, data } = $props();

	let tab = $state<'parse' | 'report'>('parse');

	// Parse tab
	type Preview = {
		walletId: string;
		description: string;
		amount: number;
		category: string;
		type: 'income' | 'expense';
	};
	let text = $state('');
	let parsing = $state(false);
	let parseError = $state('');
	let previews = $state<Preview[]>([]);
	let selected = $state<boolean[]>([]);
	let saving = $state(false);

	const selectedItems = $derived(previews.filter((_, i) => selected[i]));
	const anySelected = $derived(selected.some(Boolean));

	const walletName = (id: string) => data.wallets.find((w) => w.id === id)?.name ?? id;

	async function doParse() {
		if (!text.trim() || parsing) return;
		parsing = true;
		parseError = '';
		previews = [];
		try {
			const res = await fetch('/api/ai/parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text })
			});
			const data = (await res.json()) as { transactions?: Preview[]; error?: string };
			if (!res.ok) throw new Error(data.error ?? 'Gagal memproses teks');
			previews = data.transactions ?? [];
			selected = previews.map(() => true);
			if (previews.length === 0) parseError = 'Tidak ada transaksi yang terdeteksi dari teks ini.';
		} catch (e) {
			parseError = e instanceof Error ? e.message : 'Terjadi kesalahan';
		} finally {
			parsing = false;
		}
	}

	const handleSave: SubmitFunction = () => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			await update();
			if (result.type === 'success') {
				const count = (result.data as { count?: number } | undefined)?.count ?? 0;
				notify('success', `${count} transaksi tersimpan`);
				previews = [];
				selected = [];
				text = '';
			} else if (result.type === 'failure') {
				notify('error', (result.data as { error?: string } | undefined)?.error ?? 'Gagal menyimpan');
			}
		};
	};

	// Report tab
	type ChatItem = { role: 'user' | 'assistant'; content: string; error?: boolean };
	let question = $state('');
	let lastQuestion = $state('');
	let asking = $state(false);
	let chat = $state<ChatItem[]>([]);

	async function ask() {
		const q = question.trim();
		if (!q || asking) return;
		chat.push({ role: 'user', content: q });
		lastQuestion = q;
		question = '';
		asking = true;
		try {
			const res = await fetch('/api/ai/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: q })
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
</script>

<svelte:head>
	<title>Copilot · Finance Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-6">
	<h1 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">Copilot</h1>

	<div class="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800" role="tablist">
		<button
			role="tab"
			aria-selected={tab === 'parse'}
			onclick={() => (tab = 'parse')}
			class="rounded-lg py-2 text-sm font-medium transition
				{tab === 'parse' ? 'bg-white shadow dark:bg-gray-900' : 'text-gray-500 dark:text-gray-400'}"
		>
			<Sparkles size={14} class="inline mr-1 -mt-0.5" /> Parse Teks
		</button>
		<button
			role="tab"
			aria-selected={tab === 'report'}
			onclick={() => (tab = 'report')}
			class="rounded-lg py-2 text-sm font-medium transition
				{tab === 'report' ? 'bg-white shadow dark:bg-gray-900' : 'text-gray-500 dark:text-gray-400'}"
		>
			Tanya Laporan
		</button>
	</div>

	{#if tab === 'parse'}
		<div class="space-y-4">
			<div>
				<label for="parse-text" class="mb-1 block text-sm text-gray-700 dark:text-gray-300">
					Tulis transaksi bebas, mis. "beli kopi 25rb tadi pagi, gaji freelance 2jt kemarin"
				</label>
				<textarea
					id="parse-text"
					bind:value={text}
					rows="3"
					maxlength="500"
					class="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 dark:text-white px-3 py-2"
				></textarea>
			</div>
			<button
				onclick={doParse}
				disabled={parsing || !text.trim()}
				class="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium inline-flex items-center gap-2"
			>
				{#if parsing}<Loader2 size={14} class="animate-spin" />{/if}
				{parsing ? 'Memproses…' : 'Parse'}
			</button>

			{#if parseError}
				<p class="text-sm text-red-600 dark:text-red-400">{parseError}</p>
			{/if}

			{#if form?.error && previews.length === 0}
				<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
			{/if}

			{#if previews.length > 0}
				<div class="space-y-2">
					{#each previews as p, i (i)}
						<label
							class="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 cursor-pointer"
						>
							<input type="checkbox" bind:checked={selected[i]} class="accent-sky-600" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-gray-900 dark:text-white">{p.description}</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{p.category} · {walletName(p.walletId)}
								</p>
							</div>
							<span
								class="font-mono text-sm font-bold whitespace-nowrap
								{p.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}"
							>
								{p.type === 'income' ? '+' : '−'}{formatIDR(p.amount)}
							</span>
						</label>
					{/each}

					<form method="POST" action="?/create-bulk" use:enhance={handleSave}>
						<input type="hidden" name="items" value={JSON.stringify(selectedItems)} />
						<button
							type="submit"
							disabled={!anySelected || saving}
							class="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 text-sm font-medium"
						>
							{saving ? 'Menyimpan…' : `Simpan ${selectedItems.length} transaksi terpilih`}
						</button>
					</form>
				</div>
			{/if}
		</div>
	{:else}
		<div class="space-y-3">
			<div class="space-y-2 min-h-40">
				{#if chat.length === 0}
					<p class="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
						Tanya apa saja tentang keuangan bulan ini.
					</p>
				{/if}
				{#each chat as msg, i (i)}
					<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap
							{msg.role === 'user'
								? 'bg-sky-600 text-white'
								: msg.error
									? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
									: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'}"
						>
							{msg.content}
							{#if msg.error}
								<button
									class="mt-1 inline-flex items-center gap-1 text-xs font-medium underline"
									onclick={ask}
									disabled={asking}
								>
									<RotateCcw size={11} /> Coba lagi
								</button>
							{/if}
						</div>
					</div>
				{/each}
				{#if asking}
					<div class="flex justify-start">
						<div class="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm text-gray-500">
							<Loader2 size={14} class="inline animate-spin" /> Sedang menganalisis…
						</div>
					</div>
				{/if}
			</div>

			<form
				class="flex gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					ask();
				}}
			>
				<input
					type="text"
					bind:value={question}
					placeholder="cth. Berapa pengeluaran terbesar bulan ini?"
					maxlength="500"
					class="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 dark:text-white px-3 py-2 text-sm"
				/>
				<button
					type="submit"
					disabled={asking || !question.trim()}
					aria-label="Kirim pertanyaan"
					class="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-3"
				>
					<Send size={16} />
				</button>
			</form>
		</div>
	{/if}
</main>
