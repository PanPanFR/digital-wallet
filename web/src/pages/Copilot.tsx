import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Send, Loader2, RotateCcw } from 'lucide-react';
import { get, post } from '../api/client';
import { queryKeys } from '../lib/queryKeys';

interface ChatItem {
	role: 'user' | 'assistant';
	content: string;
	error?: boolean;
}

interface ProviderSummary {
	id: string;
	name: string;
	model: string;
	models: string[];
}

interface ProvidersResponse {
	providers: ProviderSummary[];
	activeProviderId: string;
}

export default function Copilot() {
	const [chat, setChat] = useState<ChatItem[]>([]);
	const [question, setQuestion] = useState('');
	const [lastQuestion, setLastQuestion] = useState('');
	const [asking, setAsking] = useState(false);
	const [providerId, setProviderId] = useState('');
	const [model, setModel] = useState('');
	const scrollBoxRef = useRef<HTMLDivElement>(null);

	const { data: providersData } = useQuery<ProvidersResponse>({
		queryKey: queryKeys.providers(),
		queryFn: () => get<ProvidersResponse>('/api/settings/providers')
	});

	const providers = providersData?.providers ?? [];
	const activeProviderId = providersData?.activeProviderId ?? '';

	// Sync provider selection
	useEffect(() => {
		if (!providerId && providers.length > 0) {
			const initial =
				activeProviderId && providers.some((p) => p.id === activeProviderId)
					? activeProviderId
					: providers[0].id;
			setProviderId(initial);
		}
	}, [providerId, providers, activeProviderId]);

	const selectedProvider = providers.find((p) => p.id === providerId) ?? null;

	// Sync model selection
	useEffect(() => {
		if (selectedProvider) {
			if (!selectedProvider.models.includes(model)) {
				setModel(selectedProvider.model || selectedProvider.models[0] || '');
			}
		}
	}, [selectedProvider, model]);

	// Auto scroll to bottom
	useEffect(() => {
		if (scrollBoxRef.current) {
			scrollBoxRef.current.scrollTop = scrollBoxRef.current.scrollHeight;
		}
	}, [chat, asking]);

	const ask = async (q?: string) => {
		const text = (q ?? question).trim();
		if (!text || asking) return;

		// Replay last <= 8 non-error turns
		const priorMessages = chat
			.filter((m) => !m.error)
			.slice(-8)
			.map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

		const nextChat: ChatItem[] = [...chat, { role: 'user', content: text }];
		setChat(nextChat);
		setLastQuestion(text);
		setQuestion('');
		setAsking(true);

		try {
			const res = await post<{ answer?: string; error?: string }>('/api/ai/report', {
				messages: [...priorMessages, { role: 'user', content: text }],
				providerId: providerId || undefined,
				model: model || undefined
			});

			setChat((prev) => [
				...prev,
				{ role: 'assistant', content: res.answer ?? '(Jawaban kosong)' }
			]);
		} catch (e: any) {
			const msg = e?.message || 'Terjadi kesalahan saat menghubungi AI';
			setChat((prev) => [
				...prev,
				{
					role: 'assistant',
					content: msg,
					error: true
				}
			]);
		} finally {
			setAsking(false);
		}
	};

	return (
		<main className="mx-auto flex h-[calc(100dvh-7rem)] max-w-2xl flex-col px-4 pb-4 pt-6">
			<h1 className="page-title mb-1 flex items-center gap-2">
				<Sparkles size={20} className="text-ctp-peach" /> Copilot
			</h1>

			{providers.length > 0 && (
				<div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
					<label className="flex items-center gap-1.5 text-ctp-subtext1">
						<span className="text-xs">AI</span>
						<select
							value={providerId}
							onChange={(e) => setProviderId(e.target.value)}
							disabled={asking || providers.length < 2}
							className="input w-auto px-2 py-1 disabled:opacity-50"
						>
							{providers.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</label>
					{selectedProvider && selectedProvider.models.length > 0 && (
						<label className="flex items-center gap-1.5 text-ctp-subtext1">
							<span className="text-xs">Model</span>
							<select
								value={model}
								onChange={(e) => setModel(e.target.value)}
								disabled={asking || selectedProvider.models.length < 2}
								className="input w-auto px-2 py-1 disabled:opacity-50"
							>
								{selectedProvider.models.map((m) => (
									<option key={m} value={m}>
										{m}
									</option>
								))}
							</select>
						</label>
					)}
				</div>
			)}

			<div className="flex min-h-0 flex-1 flex-col">
				<div
					ref={scrollBoxRef}
					className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3"
				>
					{chat.length === 0 && (
						<div className="flex flex-col items-center gap-4 py-10 text-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-peach/15 text-ctp-peach">
								<Sparkles size={24} />
							</div>
							<p className="text-sm text-ctp-subtext0">
								Tanya apa saja tentang keuanganmu.
							</p>
							<div className="flex flex-wrap justify-center gap-2">
								{[
									'Berapa pengeluaran hari ini?',
									'Ada utang apa saja?',
									'Pengeluaran terbesar bulan ini?'
								].map((ex) => (
									<button
										key={ex}
										type="button"
										onClick={() => ask(ex)}
										disabled={asking}
										className="chip transition-colors hover:bg-ctp-surface0 disabled:opacity-50"
									>
										{ex}
									</button>
								))}
							</div>
						</div>
					)}

					{chat.map((msg, i) => (
						<div
							key={i}
							className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							<div
								className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
									msg.role === 'user'
										? 'bg-ctp-peach/15 text-ctp-text'
										: msg.error
											? 'bg-ctp-red/10 text-ctp-red'
											: 'bg-ctp-surface0 text-ctp-text'
								}`}
							>
								{msg.content}
								{msg.error && (
									<div>
										<button
											type="button"
											className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-ctp-peach underline transition-colors hover:text-ctp-maroon"
											onClick={() => ask(lastQuestion)}
											disabled={asking}
										>
											<RotateCcw size={11} /> Coba lagi
										</button>
									</div>
								)}
							</div>
						</div>
					))}

					{asking && (
						<div className="flex justify-start">
							<div className="rounded-xl bg-ctp-surface0 px-4 py-2.5 text-sm text-ctp-subtext0">
								<Loader2 size={14} className="inline animate-spin" /> Sedang menganalisis...
							</div>
						</div>
					)}
				</div>

				<form
					className="flex gap-2 border-t border-ctp-surface0 pt-3 dark:border-ctp-surface1"
					onSubmit={(e) => {
						e.preventDefault();
						ask();
					}}
				>
					<input
						type="text"
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder="cth. Berapa pengeluaran hari ini? Ada utang apa saja?"
						maxLength={500}
						disabled={asking}
						aria-label="Pertanyaan"
						className="input flex-1"
					/>
					<button
						type="submit"
						disabled={asking || !question.trim()}
						aria-label="Kirim pertanyaan"
						className="btn btn-primary h-[38px] w-[38px] shrink-0 rounded-full"
					>
						<Send size={16} />
					</button>
				</form>
			</div>
		</main>
	);
}
