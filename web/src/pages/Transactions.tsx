import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	Plus,
	Pencil,
	Trash2,
	ReceiptText,
	ArrowDownLeft,
	ArrowUpRight,
	ArrowLeftRight
} from 'lucide-react';
import TransactionForm from '../components/TransactionForm';
import ConfirmModal from '../components/ConfirmModal';
import WalletSelect from '../components/WalletSelect';
import Skeleton from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { formatIDR, formatDate } from '@shared/format';
import { CATEGORIES } from '@shared/constants';
import { queryKeys } from '../lib/queryKeys';
import { get, del, post } from '../api/client';
import type { TxRow, WalletWithBalance } from '@shared/types';

interface TxResponse {
	transactions: TxRow[];
	hasMore: boolean;
	offset: number;
	limit: number;
}

export default function Transactions() {
	const [searchParams, setSearchParams] = useSearchParams();
	const queryClient = useQueryClient();
	const { notify } = useToast();

	const month = searchParams.get('month') || '';
	const wallet = searchParams.get('wallet') || '';
	const q = searchParams.get('q') || '';
	const category = searchParams.get('category') || '';

	// Local state for filter inputs before submit
	const [inputQ, setInputQ] = useState(q);

	// Modals & action targets
	const [showForm, setShowForm] = useState(false);
	const [editingTx, setEditingTx] = useState<TxRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<TxRow | null>(null);

	// Bulk delete selection
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [showBulkConfirm, setShowBulkConfirm] = useState(false);
	const selectAllRef = useRef<HTMLInputElement>(null);

	// Paging
	const [loadedTx, setLoadedTx] = useState<TxRow[]>([]);
	const [offset, setOffset] = useState(0);

	// Fetch Wallets for dropdown
	const { data: walletsData } = useQuery<{ wallets: WalletWithBalance[] }>({
		queryKey: queryKeys.wallets(),
		queryFn: () => get<{ wallets: WalletWithBalance[] }>('/api/wallets')
	});

	const wallets = walletsData?.wallets ?? [];

	// Build API URL
	const queryUrl = (() => {
		const p = new URLSearchParams();
		if (month) p.set('month', month);
		if (wallet) p.set('walletId', wallet);
		if (q) p.set('search', q);
		if (category) p.set('category', category);
		p.set('limit', '50');
		p.set('offset', String(offset));
		return `/api/transactions?${p.toString()}`;
	})();

	const { data, isLoading } = useQuery<TxResponse>({
		queryKey: queryKeys.transactions({ month, wallet, q, category, offset }),
		queryFn: () => get<TxResponse>(queryUrl)
	});

	// Reset accumulated transactions when filters change
	useEffect(() => {
		setOffset(0);
		setLoadedTx([]);
		setSelected(new Set());
	}, [month, wallet, q, category]);

	// Append transactions on pagination
	useEffect(() => {
		if (data?.transactions) {
			if (offset === 0) {
				setLoadedTx(data.transactions);
			} else {
				setLoadedTx((prev) => {
					const existingIds = new Set(prev.map((t) => t.id));
					const next = data.transactions.filter((t) => !existingIds.has(t.id));
					return [...prev, ...next];
				});
			}
		}
	}, [data, offset]);

	// Mobile nav FAB listener
	useEffect(() => {
		const open = () => {
			setEditingTx(null);
			setShowForm(true);
		};
		window.addEventListener('open-transaction-form', open);
		return () => window.removeEventListener('open-transaction-form', open);
	}, []);

	// Select all checkbox indeterminate state
	const selectedCount = selected.size;
	const allSelected = loadedTx.length > 0 && selectedCount === loadedTx.length;
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
			setSelected(new Set(loadedTx.map((t) => t.id)));
		}
	};

	const toggleRow = (id: string) => {
		const next = new Set(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setSelected(next);
	};

	// Single Delete Mutation
	const singleDeleteMutation = useMutation({
		mutationFn: (id: string) => del(`/api/transactions/${id}`),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['transactions'] }),
				queryClient.invalidateQueries({ queryKey: ['wallets'] }),
				queryClient.invalidateQueries({ queryKey: ['dashboard'] })
			]);
			setDeleteTarget(null);
			notify('success', 'Transaksi dihapus');
		},
		onError: () => {
			notify('error', 'Gagal menghapus transaksi');
		}
	});

	// Bulk Delete Mutation
	const bulkDeleteMutation = useMutation({
		mutationFn: (ids: string[]) => post<{ deleted: number }>('/api/transactions/bulk-delete', { ids }),
		onSuccess: async (res) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['transactions'] }),
				queryClient.invalidateQueries({ queryKey: ['wallets'] }),
				queryClient.invalidateQueries({ queryKey: ['dashboard'] })
			]);
			setSelected(new Set());
			setShowBulkConfirm(false);
			notify('success', `${res.deleted ?? selectedCount} transaksi dihapus`);
		},
		onError: () => {
			notify('error', 'Gagal menghapus transaksi terpilih');
		}
	});

	// Filter helpers
	const updateParam = (key: string, value: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value);
		else next.delete(key);
		setSearchParams(next);
	};

	const resetFilters = () => {
		setInputQ('');
		setSearchParams(new URLSearchParams());
	};

	// Totals of loaded transactions
	const monthIncome = loadedTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
	const monthExpense = loadedTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
	const monthDiff = monthIncome - monthExpense;

	const monthLabel = month
		? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
				new Date(month + '-01')
			)
		: '';

	return (
		<main className="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
			{/* Page Header */}
			<div className="page-header">
				<h1 className="page-title">Transaksi</h1>
				<button
					type="button"
					onClick={() => {
						setEditingTx(null);
						setShowForm(true);
					}}
					className="btn btn-primary px-3 py-2 cursor-pointer"
				>
					<Plus size={16} /> Catat
				</button>
			</div>

			{/* Total Transaksi Card */}
			<section className="card mb-3 p-4" aria-label="Total transaksi">
				<div className="section-header">
					<h2 className="section-title">Total{month ? ` ${monthLabel}` : ''}</h2>
				</div>
				<p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<span className="num font-bold tabular-nums text-ctp-green">+ {formatIDR(monthIncome)}</span>
					<span className="num font-bold tabular-nums text-ctp-red">− {formatIDR(monthExpense)}</span>
					<span
						className={`num ml-auto font-bold tabular-nums ${
							monthDiff < 0 ? 'text-ctp-red' : 'text-ctp-text'
						}`}
					>
						{monthDiff < 0 ? '−' : '+'} {formatIDR(Math.abs(monthDiff))}
					</span>
				</p>
			</section>

			{/* Kind Chips Filter */}
			<div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter jenis dompet">
				<button
					type="button"
					onClick={() => updateParam('wallet', '')}
					className={`${!wallet ? 'chip-active' : 'chip'} px-3 py-1 cursor-pointer`}
				>
					Semua
				</button>
				<button
					type="button"
					onClick={() => updateParam('wallet', 'digital')}
					className={`${wallet === 'digital' ? 'chip-active' : 'chip'} px-3 py-1 cursor-pointer`}
				>
					Digital
				</button>
				<button
					type="button"
					onClick={() => updateParam('wallet', 'cash')}
					className={`${wallet === 'cash' ? 'chip-active' : 'chip'} px-3 py-1 cursor-pointer`}
				>
					Tunai
				</button>
			</div>

			{/* Filter Controls Form */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					updateParam('q', inputQ.trim());
				}}
				className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto] sm:items-end"
			>
				<div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
					<label htmlFor="tx-filter-month" className="label">Bulan</label>
					<input
						id="tx-filter-month"
						name="month"
						type="month"
						value={month}
						onChange={(e) => updateParam('month', e.target.value)}
						className="input w-full"
					/>
				</div>

				<div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
					<label htmlFor="tx-filter-wallet" className="label">Dompet</label>
					<WalletSelect
						id="tx-filter-wallet"
						value={wallet === 'digital' || wallet === 'cash' ? '' : wallet}
						onChange={(e) => updateParam('wallet', e.target.value)}
						placeholder="Semua dompet"
						placeholderDisabled={false}
						className="w-full"
						wallets={wallets}
					/>
				</div>

				<div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
					<label htmlFor="tx-filter-q" className="label">Cari</label>
					<input
						id="tx-filter-q"
						type="search"
						name="q"
						placeholder="Cari deskripsi…"
						value={inputQ}
						onChange={(e) => setInputQ(e.target.value)}
						aria-label="Cari deskripsi"
						className="input w-full"
					/>
				</div>

				<div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
					<label htmlFor="tx-filter-category" className="label">Kategori</label>
					<select
						id="tx-filter-category"
						name="category"
						aria-label="Kategori"
						value={category}
						onChange={(e) => updateParam('category', e.target.value)}
						className="input w-full"
					>
						<option value="">Semua kategori</option>
						{CATEGORIES.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</div>

				<div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1 sm:justify-end">
					<button type="submit" className="btn btn-outline px-4 py-2 cursor-pointer">
						Terapkan
					</button>
					{(month || wallet || q || category) && (
						<button
							type="button"
							onClick={resetFilters}
							className="text-sm text-ctp-peach hover:underline cursor-pointer"
						>
							Reset
						</button>
					)}
				</div>
			</form>

			{/* Loading State */}
			{isLoading && offset === 0 ? (
				<Skeleton rows={5} />
			) : loadedTx.length === 0 ? (
				/* Empty State */
				<div className="card py-12 text-center">
					<div
						className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-surface0 text-ctp-subtext0"
						aria-hidden="true"
					>
						<ReceiptText size={22} />
					</div>
					<p className="text-sm font-medium text-ctp-text">
						Belum ada transaksi{month ? ` untuk ${monthLabel}` : ''}
					</p>
					<p className="mt-1 text-xs text-ctp-subtext0">
						Catat transaksi pertama dengan tombol "Catat" di atas.
					</p>
				</div>
			) : (
				<>
					{/* Bulk select header bar */}
					<div className="mb-2 flex items-center justify-between gap-3">
						<label htmlFor="select-all-tx" className="flex items-center gap-2 text-sm text-ctp-subtext1 cursor-pointer">
							<input
								id="select-all-tx"
								ref={selectAllRef}
								type="checkbox"
								checked={allSelected}
								onChange={toggleSelectAll}
								aria-label="Pilih semua transaksi"
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
									aria-label={`Hapus ${selectedCount} transaksi terpilih`}
									className="btn btn-danger px-3 py-1.5 text-xs sm:text-sm cursor-pointer"
								>
									<Trash2 size={15} /> Hapus ({selectedCount})
								</button>
							</div>
						)}
					</div>

					{/* Transaction List */}
					<ul className="list">
						{loadedTx.map((tx) => (
							<li key={tx.id} className="list-row min-w-0">
								<input
									type="checkbox"
									checked={selected.has(tx.id)}
									onChange={() => toggleRow(tx.id)}
									aria-label={`Pilih transaksi ${tx.description}`}
									className="h-4 w-4 shrink-0 rounded border-ctp-surface0 accent-ctp-peach dark:border-ctp-surface1 mr-1"
								/>
								<span
									className={`tile h-8 w-8 ${
										tx.type === 'income'
											? 'bg-ctp-green/15 text-ctp-green'
											: tx.type === 'expense'
												? 'bg-ctp-red/15 text-ctp-red'
												: 'bg-ctp-blue/15 text-ctp-blue'
									}`}
									aria-hidden="true"
								>
									{tx.type === 'income' ? (
										<ArrowDownLeft size={16} />
									) : tx.type === 'expense' ? (
										<ArrowUpRight size={16} />
									) : (
										<ArrowLeftRight size={16} />
									)}
								</span>

								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-ctp-text">{tx.description}</p>
									<p className="text-xs text-ctp-subtext0">
										{tx.category} · {formatDate(tx.date)}
									</p>
								</div>

								{tx.type === 'transfer' && tx.dest_wallet_name && (
									<span className="chip max-sm:sr-only">
										→ {tx.dest_wallet_name}
									</span>
								)}
								<span className="chip max-sm:sr-only">
									{tx.wallet_name}
								</span>

								<span
									className={`num text-[13px] font-semibold whitespace-nowrap tabular-nums sm:text-sm ${
										tx.type === 'transfer'
											? 'text-ctp-blue'
											: tx.type === 'income'
												? 'text-ctp-green'
												: 'text-ctp-red'
									}`}
								>
									{tx.type === 'income' ? '+' : '−'} {formatIDR(tx.amount)}
								</span>

								<div className="flex shrink-0 gap-0.5 sm:gap-1">
									<button
										type="button"
										onClick={() => {
											setEditingTx(tx);
											setShowForm(true);
										}}
										aria-label={`Edit ${tx.description}`}
										className="btn btn-ghost min-h-[40px] min-w-[40px] rounded-lg p-2 sm:min-h-0 sm:min-w-0 sm:p-1.5 cursor-pointer"
									>
										<Pencil size={15} />
									</button>
									<button
										type="button"
										onClick={() => setDeleteTarget(tx)}
										aria-label={`Hapus ${tx.description}`}
										className="btn btn-ghost min-h-[40px] min-w-[40px] rounded-lg p-2 hover:text-ctp-red sm:min-h-0 sm:min-w-0 sm:p-1.5 cursor-pointer"
									>
										<Trash2 size={15} />
									</button>
								</div>
							</li>
						))}
					</ul>

					{/* Load More Button */}
					{data?.hasMore && (
						<div className="mt-3 text-center">
							<button
								type="button"
								onClick={() => setOffset((prev) => prev + 50)}
								className="btn btn-outline px-4 py-2 cursor-pointer"
							>
								Muat lebih
							</button>
						</div>
					)}
				</>
			)}

			{/* Create/Edit Modal */}
			<TransactionForm
				open={showForm}
				transaction={editingTx}
				wallets={wallets}
				onClose={() => {
					setShowForm(false);
					setEditingTx(null);
				}}
			/>

			{/* Single Delete Confirm */}
			<ConfirmModal
				open={!!deleteTarget}
				title="Hapus Transaksi"
				message={
					deleteTarget
						? `Hapus "${deleteTarget.description}" (${formatIDR(deleteTarget.amount)})? Tindakan ini tidak bisa dibatalkan.`
						: ''
				}
				confirmText={singleDeleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
				onConfirm={() => {
					if (deleteTarget) singleDeleteMutation.mutate(deleteTarget.id);
				}}
				onCancel={() => setDeleteTarget(null)}
			/>

			{/* Bulk Delete Confirm */}
			<ConfirmModal
				open={showBulkConfirm}
				title="Hapus Transaksi Terpilih"
				message={`Hapus ${selectedCount} transaksi terpilih? Tindakan ini tidak bisa dibatalkan.`}
				confirmText={bulkDeleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
				onConfirm={() => {
					bulkDeleteMutation.mutate([...selected]);
				}}
				onCancel={() => setShowBulkConfirm(false)}
			/>
		</main>
	);
}
