import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	Plus,
	Trash2,
	TrendingDown,
	TrendingUp,
	ArrowLeftRight,
	X,
	CircleCheck,
	Clock
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import ModalShell from '../components/ModalShell';
import WalletSelect from '../components/WalletSelect';
import Skeleton from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { formatIDR, formatDate, todayISO } from '@shared/format';
import { AMOUNT_PRESETS } from '@shared/constants';
import { DebtApiSchema, DebtPaymentSchema, fieldErrors } from '@shared/validation';
import { queryKeys } from '../lib/queryKeys';
import { get, post, del, ApiError } from '../api/client';
import type { DebtRow, WalletWithBalance } from '@shared/types';

interface DebtsResponse {
	debts: DebtRow[];
	totals: {
		owe: number;
		owed: number;
	};
}

function avatarTint(d: DebtRow) {
	return d.direction === 'owe' ? 'bg-ctp-red/15 text-ctp-red' : 'bg-ctp-green/15 text-ctp-green';
}

function initials(name: string) {
	return (
		name
			.trim()
			.split(/\s+/)
			.map((w) => [...w][0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase() || '?'
	);
}

const kpiTiles = {
	owe: 'bg-ctp-red/10 text-ctp-red',
	owed: 'bg-ctp-green/10 text-ctp-green',
	diff: 'bg-ctp-surface0 text-ctp-subtext0'
} as const;

export default function Debts() {
	const queryClient = useQueryClient();
	const { notify } = useToast();

	// Active tab filter: 'all' | 'owe' | 'owed'
	const [tab, setTab] = useState<'all' | 'owe' | 'owed'>('all');

	// Create Modal state
	const [showCreate, setShowCreate] = useState(false);
	const [person, setPerson] = useState('');
	const [direction, setDirection] = useState<'owe' | 'owed'>('owe');
	const [amount, setAmount] = useState<string>('');
	const [date, setDate] = useState(todayISO());
	const [reduceBalance, setReduceBalance] = useState(false);
	const [walletId, setWalletId] = useState('');
	const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

	// Pay Modal state
	const [payTarget, setPayTarget] = useState<DebtRow | null>(null);
	const [payAmount, setPayAmount] = useState('');
	const [payWalletId, setPayWalletId] = useState('');
	const [payDate, setPayDate] = useState(todayISO());
	const [payErrors, setPayErrors] = useState<Record<string, string>>({});
	const [payError, setPayError] = useState('');

	// Delete state
	const [deleteTarget, setDeleteTarget] = useState<DebtRow | null>(null);

	// Bulk select
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [showBulkConfirm, setShowBulkConfirm] = useState(false);
	const selectAllRef = useRef<HTMLInputElement>(null);

	// Fetch Debts
	const { data, isLoading } = useQuery<DebtsResponse>({
		queryKey: queryKeys.debts(),
		queryFn: () => get<DebtsResponse>('/api/debts')
	});

	// Fetch Wallets
	const { data: walletsData } = useQuery<{ wallets: WalletWithBalance[] }>({
		queryKey: queryKeys.wallets(),
		queryFn: () => get<{ wallets: WalletWithBalance[] }>('/api/wallets')
	});

	const wallets = walletsData?.wallets ?? [];
	const allDebts = data?.debts ?? [];
	const filteredDebts = allDebts.filter((d) => (tab === 'all' ? true : d.direction === tab));

	const totals = data?.totals ?? { owe: 0, owed: 0 };
	const diff = totals.owed - totals.owe;

	// Invalidation helper
	const invalidateAll = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['debts'] }),
			queryClient.invalidateQueries({ queryKey: ['wallets'] }),
			queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
			queryClient.invalidateQueries({ queryKey: ['transactions'] })
		]);
	};

	// Indeterminate checkbox handling
	const selectedCount = selected.size;
	const allSelected = filteredDebts.length > 0 && selectedCount === filteredDebts.length;
	const indeterminate = selectedCount > 0 && !allSelected;

	useEffect(() => {
		if (selectAllRef.current) {
			selectAllRef.current.indeterminate = indeterminate;
		}
	}, [indeterminate]);

	const toggleSelectAll = () => {
		if (allSelected) {
			setSelected(new Set());
		} else {
			setSelected(new Set(filteredDebts.map((d) => d.id)));
		}
	};

	const toggleRow = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelected(next);
	};

	// Create Debt Mutation
	const createMutation = useMutation({
		mutationFn: (payload: unknown) => post('/api/debts', payload),
		onSuccess: async () => {
			await invalidateAll();
			notify('success', 'Utang dicatat');
			setShowCreate(false);
			setPerson('');
			setDirection('owe');
			setAmount('');
			setDate(todayISO());
			setReduceBalance(false);
			setWalletId('');
			setCreateErrors({});
		},
		onError: (err: unknown) => {
			if (err instanceof ApiError) {
				if (Object.keys(err.fieldErrors).length > 0) {
					setCreateErrors(err.fieldErrors);
					return;
				}
				notify('error', err.message);
			} else {
				notify('error', 'Gagal mencatat utang');
			}
		}
	});

	// Pay Debt Mutation
	const payMutation = useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
			post(`/api/debts/${id}/payments`, payload),
		onSuccess: async () => {
			await invalidateAll();
			notify('success', 'Pembayaran dicatat');
			setPayTarget(null);
			setPayErrors({});
			setPayError('');
		},
		onError: (err: unknown) => {
			if (err instanceof ApiError) {
				if (err.data && (err.data as { code?: string }).code === 'overpay') {
					setPayError('Nominal melebihi sisa utang');
					return;
				}
				if (Object.keys(err.fieldErrors).length > 0) {
					setPayErrors(err.fieldErrors);
					return;
				}
				setPayError(err.message);
			} else {
				setPayError('Gagal menyimpan pembayaran');
			}
		}
	});

	// Delete Debt Mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string) => del(`/api/debts/${id}`),
		onSuccess: async () => {
			await invalidateAll();
			setDeleteTarget(null);
			notify('success', 'Catatan hutang dihapus');
		},
		onError: () => {
			notify('error', 'Gagal menghapus catatan hutang');
		}
	});

	// Bulk Delete Debt Mutation
	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: string[]) => post<{ deleted: number }>('/api/debts/bulk-delete', { ids }),
		onSuccess: async (res) => {
			await invalidateAll();
			setSelected(new Set());
			setShowBulkConfirm(false);
			notify('success', `${res.deleted ?? selectedCount} catatan hutang dihapus`);
		},
		onError: () => {
			notify('error', 'Gagal menghapus catatan hutang');
		}
	});

	const handleCreateSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const payload = {
			person: person.trim(),
			direction,
			amount: Number(amount),
			date,
			reduceBalance,
			walletId: reduceBalance ? walletId : ''
		};

		const parsed = DebtApiSchema.safeParse(payload);
		if (!parsed.success) {
			setCreateErrors(fieldErrors(parsed.error));
			return;
		}

		setCreateErrors({});
		createMutation.mutate(payload);
	};

	const openPay = (d: DebtRow) => {
		setPayTarget(d);
		setPayAmount(String(d.remaining));
		setPayWalletId(d.wallet_id ?? (wallets[0]?.id ?? ''));
		setPayDate(todayISO());
		setPayErrors({});
		setPayError('');
	};

	const handlePaySubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!payTarget) return;

		const payload = {
			debtId: payTarget.id,
			amount: Number(payAmount),
			walletId: payWalletId,
			date: payDate
		};

		const parsed = DebtPaymentSchema.safeParse(payload);
		if (!parsed.success) {
			setPayErrors(fieldErrors(parsed.error));
			return;
		}

		setPayErrors({});
		setPayError('');
		payMutation.mutate({ id: payTarget.id, payload });
	};

	const pct = (d: DebtRow) => {
		return d.amount > 0 ? Math.min(100, (d.paid / d.amount) * 100) : 0;
	};

	return (
		<main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-6">
			{/* Page Header */}
			<div className="page-header">
				<h1 className="page-title">Hutang</h1>
				<button
					type="button"
					onClick={() => {
						setPerson('');
						setDirection('owe');
						setAmount('');
						setDate(todayISO());
						setReduceBalance(false);
						setWalletId(wallets[0]?.id ?? '');
						setCreateErrors({});
						setShowCreate(true);
					}}
					className="btn btn-primary px-3 py-2 cursor-pointer"
				>
					<Plus size={16} /> Catat
				</button>
			</div>

			{/* KPI Summary Cards */}
			<section className="grid gap-3 sm:grid-cols-3" aria-label="Ringkasan hutang">
				<div className="card p-4">
					<div className="flex items-center gap-2.5">
						<span className={`tile ${kpiTiles.owe}`}>
							<TrendingDown size={16} />
						</span>
						<div>
							<p className="text-xs text-ctp-subtext0">Hutang Saya</p>
							<p className="num text-lg font-bold tabular-nums text-ctp-red">
								{formatIDR(totals.owe)}
							</p>
						</div>
					</div>
				</div>

				<div className="card p-4">
					<div className="flex items-center gap-2.5">
						<span className={`tile ${kpiTiles.owed}`}>
							<TrendingUp size={16} />
						</span>
						<div>
							<p className="text-xs text-ctp-subtext0">Piutang Saya</p>
							<p className="num text-lg font-bold tabular-nums text-ctp-green">
								{formatIDR(totals.owed)}
							</p>
						</div>
					</div>
				</div>

				<div className="card p-4">
					<div className="flex items-center gap-2.5">
						<span className={`tile ${kpiTiles.diff}`}>
							<ArrowLeftRight size={16} />
						</span>
						<div>
							<p className="text-xs text-ctp-subtext0">Selisih</p>
							<p
								className={`num text-2xl font-extrabold tabular-nums ${
									diff < 0 ? 'text-ctp-red' : 'text-ctp-text'
								}`}
							>
								{formatIDR(diff)}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Tabs filter */}
			<div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter hutang">
				<button
					type="button"
					onClick={() => setTab('all')}
					className={`${tab === 'all' ? 'chip-active' : 'chip'} px-3 py-1 cursor-pointer`}
				>
					Semua ({allDebts.length})
				</button>
				<button
					type="button"
					onClick={() => setTab('owe')}
					className={`${tab === 'owe' ? 'chip-active' : 'chip'} px-3 py-1 cursor-pointer`}
				>
					Hutang ({allDebts.filter((d) => d.direction === 'owe').length})
				</button>
				<button
					type="button"
					onClick={() => setTab('owed')}
					className={`${tab === 'owed' ? 'chip-active' : 'chip'} px-3 py-1 cursor-pointer`}
				>
					Piutang ({allDebts.filter((d) => d.direction === 'owed').length})
				</button>
			</div>

			{/* Debt List Section */}
			<section className="mt-4" aria-label="Daftar hutang">
				{isLoading ? (
					<Skeleton rows={4} />
				) : filteredDebts.length === 0 ? (
					<div className="card py-12 text-center">
						<div
							className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-surface0 text-ctp-subtext0"
							aria-hidden="true"
						>
							<TrendingDown size={22} />
						</div>
						<p className="text-sm font-medium text-ctp-text">Belum ada catatan hutang.</p>
						<p className="mt-1 text-xs text-ctp-subtext0">Catat utang atau piutang dengan tombol Catat.</p>
					</div>
				) : (
					<>
						{/* Bulk Select Controls */}
						<div className="mb-2 flex items-center justify-between gap-3">
							<label htmlFor="select-all-debts" className="flex items-center gap-2 text-sm text-ctp-subtext1 cursor-pointer">
								<input
									id="select-all-debts"
									ref={selectAllRef}
									type="checkbox"
									checked={allSelected}
									onChange={toggleSelectAll}
									aria-label="Pilih semua catatan hutang"
									className="h-4 w-4 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1"
								/>
								Pilih semua
							</label>

							{selectedCount > 0 && (
								<div className="flex items-center gap-2">
									<span className="text-xs text-ctp-subtext0 hidden sm:inline">
										Menghapus yang terpilih di halaman ini saja.
									</span>
									<button
										type="button"
										onClick={() => setShowBulkConfirm(true)}
										aria-label={`Hapus ${selectedCount} catatan hutang terpilih`}
										className="btn btn-danger px-3 py-1.5 text-xs sm:text-sm cursor-pointer"
									>
										<Trash2 size={15} /> Hapus ({selectedCount})
									</button>
								</div>
							)}
						</div>

						{/* List Rows */}
						<ul className="list">
							{filteredDebts.map((d) => (
								<li key={d.id} className={`list-row ${d.remaining === 0 ? 'opacity-60' : ''}`}>
									<div className="flex w-full items-center gap-3">
										<input
											type="checkbox"
											checked={selected.has(d.id)}
											onChange={() => toggleRow(d.id)}
											aria-label={`Pilih catatan hutang ${d.person}`}
											className="h-4 w-4 shrink-0 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1"
										/>
										<span
											className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTint(
												d
											)}`}
											aria-hidden="true"
										>
											{initials(d.person)}
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<p className="truncate text-sm font-medium text-ctp-text">{d.person}</p>
												<span
													className={`chip ${
														d.direction === 'owe'
															? 'bg-ctp-red/10 text-ctp-red'
															: 'bg-ctp-green/10 text-ctp-green'
													}`}
												>
													{d.direction === 'owe' ? (
														<TrendingDown size={12} aria-hidden="true" />
													) : (
														<TrendingUp size={12} aria-hidden="true" />
													)}
													{d.direction === 'owe' ? 'Utang' : 'Piutang'}
												</span>
												{d.remaining === 0 ? (
													<span className="chip bg-ctp-green/10 text-ctp-green">
														<CircleCheck size={12} aria-hidden="true" /> Lunas
													</span>
												) : (
													<span className="chip chip-warn bg-ctp-yellow/20 font-semibold ring-1 ring-inset ring-ctp-yellow/40">
														<Clock size={12} aria-hidden="true" /> Belum
													</span>
												)}
											</div>
											<p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ctp-subtext0">
												<span>{formatDate(d.date)}</span>
												{d.wallet_name && (
													<span className="rounded-full bg-ctp-surface0 px-1.5 py-0.5 font-medium text-ctp-subtext0">
														{d.wallet_name}
													</span>
												)}
											</p>
											<div
												className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ctp-surface0"
												role="progressbar"
												aria-valuenow={Math.round(pct(d))}
												aria-valuemin={0}
												aria-valuemax={100}
												aria-label={`Progress pelunasan ${d.person}`}
											>
												<div
													className="h-full rounded-full bg-ctp-peach"
													style={{ width: `${pct(d)}%` }}
												/>
											</div>
										</div>

										<div className="flex flex-col items-end gap-1.5">
											<div className="text-right">
												<p className="text-xs text-ctp-subtext0">Sisa</p>
												<span
													className={`num whitespace-nowrap text-sm font-bold tabular-nums ${
														d.remaining === 0 ? 'text-ctp-green' : 'text-ctp-text'
													}`}
												>
													{formatIDR(d.remaining)}
												</span>
											</div>
											<div className="flex gap-1">
												{d.remaining > 0 && (
													<button
														type="button"
														onClick={() => openPay(d)}
														className="btn btn-primary px-2.5 py-1 text-xs cursor-pointer"
													>
														Bayar
													</button>
												)}
												<button
													type="button"
													onClick={() => setDeleteTarget(d)}
													aria-label={`Hapus catatan hutang ${d.person}`}
													className="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red cursor-pointer"
												>
													<Trash2 size={15} />
												</button>
											</div>
										</div>
									</div>
								</li>
							))}
						</ul>
					</>
				)}
			</section>

			{/* Modal Catat Utang */}
			<ModalShell open={showCreate} labelledby="debt-form-title" onClose={() => setShowCreate(false)}>
				<div className="flex items-center justify-between">
					<div>
						<h2 id="debt-form-title" className="font-semibold text-ctp-text">Catat Utang</h2>
						<p className="text-xs text-ctp-subtext0">Catat utang kamu atau piutang orang lain</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost p-1.5"
						aria-label="Tutup dialog"
						disabled={createMutation.isPending}
						onClick={() => setShowCreate(false)}
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={handleCreateSubmit} noValidate className="space-y-4">
					<div>
						<label htmlFor="debt-person" className="label">Nama</label>
						<input
							id="debt-person"
							name="person"
							type="text"
							required
							maxLength={60}
							placeholder="cth. Budi, Ibu Sari"
							value={person}
							onChange={(e) => setPerson(e.target.value)}
							aria-invalid={!!createErrors.person}
							className={`input ${createErrors.person ? 'border-ctp-red' : ''}`}
						/>
						{createErrors.person && <p className="mt-1 text-xs text-ctp-red">{createErrors.person}</p>}
					</div>

					<div>
						<span className="label">Arah</span>
						<div className="grid grid-cols-2 gap-2" role="group" aria-label="Arah hutang">
							<button
								type="button"
								aria-pressed={direction === 'owe'}
								onClick={() => setDirection('owe')}
								className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors cursor-pointer ${
									direction === 'owe'
										? 'border-ctp-red bg-ctp-red/10 text-ctp-red'
										: 'border-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface0 dark:border-ctp-surface1'
								}`}
							>
								<TrendingDown size={14} /> Saya Berhutang
							</button>
							<button
								type="button"
								aria-pressed={direction === 'owed'}
								onClick={() => setDirection('owed')}
								className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors cursor-pointer ${
									direction === 'owed'
										? 'border-ctp-green bg-ctp-green/10 text-ctp-green'
										: 'border-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface0 dark:border-ctp-surface1'
								}`}
							>
								<TrendingUp size={14} /> Saya Meminjamkan
							</button>
						</div>
						{createErrors.direction && <p className="mt-1 text-xs text-ctp-red">{createErrors.direction}</p>}
					</div>

					<div>
						<div className="mb-1 flex items-center justify-between">
							<label htmlFor="debt-amount" className="text-sm font-medium text-ctp-text">Jumlah (IDR)</label>
							{amount && Number(amount) > 0 && (
								<span className="num text-xs font-semibold tabular-nums text-ctp-subtext0">
									Rp {Number(amount).toLocaleString('id-ID')}
								</span>
							)}
						</div>
						<input
							id="debt-amount"
							name="amount"
							type="number"
							min="1"
							step="1"
							required
							placeholder="0"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							aria-invalid={!!createErrors.amount}
							className={`input num font-semibold tabular-nums ${
								createErrors.amount ? 'border-ctp-red' : ''
							}`}
						/>
						{createErrors.amount && <p className="mt-1 text-xs text-ctp-red">{createErrors.amount}</p>}
						<div className="mt-2 flex flex-wrap gap-1.5">
							{AMOUNT_PRESETS.map(([val, label]) => (
								<button
									key={label}
									type="button"
									className="chip bg-ctp-surface0 text-ctp-subtext1 transition-colors hover:bg-ctp-surface1 cursor-pointer"
									onClick={() => setAmount(String((Number(amount) || 0) + val))}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					<div>
						<label htmlFor="debt-date" className="label">Tanggal</label>
						<input
							id="debt-date"
							name="date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							aria-invalid={!!createErrors.date}
							className={`input ${createErrors.date ? 'border-ctp-red' : ''}`}
						/>
						{createErrors.date && <p className="mt-1 text-xs text-ctp-red">{createErrors.date}</p>}
					</div>

					<div className="space-y-2">
						<label htmlFor="debt-reduce" className="flex items-start gap-2 text-sm text-ctp-text cursor-pointer">
							<input
								id="debt-reduce"
								type="checkbox"
								name="reduceBalance"
								checked={reduceBalance}
								onChange={(e) => setReduceBalance(e.target.checked)}
								className="mt-0.5 h-4 w-4 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1"
							/>
							<span>Langsung kurangi saldo dompet ini</span>
						</label>

						{reduceBalance && (
							<div>
								<label htmlFor="debt-wallet" className="label">Dompet</label>
								<WalletSelect
									id="debt-wallet"
									name="walletId"
									value={walletId}
									onChange={(e) => setWalletId(e.target.value)}
									required
									invalid={!!createErrors.walletId}
									wallets={wallets}
								/>
								{createErrors.walletId && (
									<p className="mt-1 text-xs text-ctp-red">{createErrors.walletId}</p>
								)}
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							disabled={createMutation.isPending}
							onClick={() => setShowCreate(false)}
							className="btn btn-outline px-4 py-2"
						>
							Batal
						</button>
						<button
							type="submit"
							disabled={createMutation.isPending}
							className="btn btn-primary px-4 py-2"
						>
							{createMutation.isPending ? 'Menyimpan…' : 'Catat'}
						</button>
					</div>
				</form>
			</ModalShell>

			{/* Modal Bayar */}
			<ModalShell open={!!payTarget} labelledby="pay-form-title" onClose={() => setPayTarget(null)}>
				<div className="flex items-center justify-between">
					<div>
						<h2 id="pay-form-title" className="font-semibold text-ctp-text">
							Bayar — {payTarget?.person}
						</h2>
						<p className="text-xs text-ctp-subtext0">
							{payTarget?.direction === 'owe' ? 'Utang' : 'Piutang'} ·{' '}
							{payTarget ? formatDate(payTarget.date) : ''}
						</p>
					</div>
					<button
						type="button"
						className="btn btn-ghost p-1.5"
						aria-label="Tutup dialog"
						disabled={payMutation.isPending}
						onClick={() => setPayTarget(null)}
					>
						<X size={18} />
					</button>
				</div>

				{payTarget && (
					<>
						{payError && (
							<p
								className="rounded-lg border border-ctp-red/40 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
								role="alert"
							>
								{payError}
							</p>
						)}

						<form onSubmit={handlePaySubmit} noValidate className="space-y-4">
							<div>
								<div className="mb-1 flex items-center justify-between">
									<label htmlFor="pay-amount" className="text-sm font-medium text-ctp-text">
										Jumlah (IDR)
									</label>
									<span className="num text-xs tabular-nums text-ctp-subtext0">
										Sisa: {formatIDR(payTarget.remaining)}
									</span>
								</div>
								<input
									id="pay-amount"
									name="amount"
									type="number"
									min="1"
									max={payTarget.remaining}
									step="1"
									required
									value={payAmount}
									onChange={(e) => setPayAmount(e.target.value)}
									aria-invalid={!!payErrors.amount}
									className={`input num font-semibold tabular-nums ${
										payErrors.amount ? 'border-ctp-red' : ''
									}`}
								/>
								{payErrors.amount && <p className="mt-1 text-xs text-ctp-red">{payErrors.amount}</p>}
							</div>

							<div>
								<label htmlFor="pay-wallet" className="label">Dompet</label>
								<WalletSelect
									id="pay-wallet"
									name="walletId"
									value={payWalletId}
									onChange={(e) => setPayWalletId(e.target.value)}
									required
									invalid={!!payErrors.walletId}
									wallets={wallets}
								/>
								{payErrors.walletId && (
									<p className="mt-1 text-xs text-ctp-red">{payErrors.walletId}</p>
								)}
							</div>

							<div>
								<label htmlFor="pay-date" className="label">Tanggal</label>
								<input
									id="pay-date"
									name="date"
									type="date"
									value={payDate}
									onChange={(e) => setPayDate(e.target.value)}
									aria-invalid={!!payErrors.date}
									className={`input ${payErrors.date ? 'border-ctp-red' : ''}`}
								/>
								{payErrors.date && <p className="mt-1 text-xs text-ctp-red">{payErrors.date}</p>}
							</div>

							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									disabled={payMutation.isPending}
									onClick={() => setPayTarget(null)}
									className="btn btn-outline px-4 py-2"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={payMutation.isPending}
									className="btn btn-primary px-4 py-2"
								>
									{payMutation.isPending ? 'Menyimpan…' : 'Bayar'}
								</button>
							</div>
						</form>
					</>
				)}
			</ModalShell>

			{/* Single Delete Confirm Modal */}
			<ConfirmModal
				open={!!deleteTarget}
				title="Hapus Catatan Hutang"
				message={
					deleteTarget
						? deleteTarget.paid > 0
							? `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(
									deleteTarget.amount
								)})? Catatan ini punya pembayaran tercatat ${formatIDR(
									deleteTarget.paid
								)}. Riwayat hutang dihapus, tapi transaksi dompet yang sudah tercatat tetap tersimpan.`
							: `Hapus catatan hutang "${deleteTarget.person}" (${formatIDR(
									deleteTarget.amount
								)})? Tindakan ini tidak bisa dibatalkan.`
						: ''
				}
				confirmText={deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
				}}
				onCancel={() => setDeleteTarget(null)}
			/>

			{/* Bulk Delete Confirm Modal */}
			<ConfirmModal
				open={showBulkConfirm}
				title="Hapus Catatan Terpilih"
				message={`Hapus ${selectedCount} catatan hutang terpilih? Riwayat hutang dihapus, tapi transaksi dompet yang sudah tercatat tetap tersimpan.`}
				confirmText={bulkDeleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
				onConfirm={() => {
					bulkDeleteMutation.mutate([...selected]);
				}}
				onCancel={() => setShowBulkConfirm(false)}
			/>
		</main>
	);
}
