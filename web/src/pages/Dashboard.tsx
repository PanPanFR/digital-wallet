import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
	Plus,
	ArrowUpRight,
	ArrowDownLeft,
	ArrowLeftRight,
	Wallet,
	Smartphone,
	Banknote,
	TrendingDown
} from 'lucide-react';
import TransactionForm from '../components/TransactionForm';
import Skeleton from '../components/Skeleton';
import { formatIDR, formatDate } from '@shared/format';
import { queryKeys } from '../lib/queryKeys';
import { get } from '../api/client';
import type { DashboardData, WalletRow } from '@shared/types';

function currentMonthISO(): string {
	return new Date().toISOString().slice(0, 7);
}

function monthLong(ym: string): string {
	try {
		return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
			new Date(`${ym}-01T00:00:00`)
		);
	} catch {
		return ym;
	}
}

export default function Dashboard() {
	const [month, setMonth] = useState(currentMonthISO);
	const [showForm, setShowForm] = useState(false);
	const [formPreset, setFormPreset] = useState<'income' | 'expense'>('expense');

	const { data, isLoading } = useQuery<DashboardData>({
		queryKey: queryKeys.dashboard(month),
		queryFn: () => get<DashboardData>(`/api/dashboard?month=${month}`)
	});

	// Listen to mobile nav FAB "Catat" event
	useEffect(() => {
		const open = () => {
			setFormPreset('expense');
			setShowForm(true);
		};
		window.addEventListener('open-transaction-form', open);
		return () => window.removeEventListener('open-transaction-form', open);
	}, []);

	const openForm = (preset: 'income' | 'expense') => {
		setFormPreset(preset);
		setShowForm(true);
	};

	const digitalWallets = data?.balances.filter((w) => w.kind === 'digital') ?? [];
	const cashWallets = data?.balances.filter((w) => w.kind === 'cash') ?? [];

	const totalDebtsRemaining = data?.openDebts?.reduce((acc, d) => acc + d.remaining, 0) ?? 0;

	return (
		<main className="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
			{/* Page Header */}
			<div className="page-header flex-wrap">
				<div>
					<h1 className="page-title">Halo</h1>
					<p className="page-subtitle">{monthLong(month)}</p>
				</div>
				<div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
					<label htmlFor="dashboard-month" className="sr-only">Bulan</label>
					<input
						id="dashboard-month"
						name="month"
						type="month"
						value={month}
						onChange={(e) => setMonth(e.target.value || currentMonthISO())}
						className="input min-w-0 flex-1 px-2.5 py-1.5 sm:w-auto sm:flex-none"
					/>
				</div>
			</div>

			{isLoading ? (
				<Skeleton rows={4} />
			) : (
				<>
					{/* Total Saldo Card */}
					<section className="rounded-xl bg-ctp-blue p-5 text-white dark:text-ctp-crust" aria-label="Total saldo">
						<div className="flex items-center gap-1.5 text-xs text-white/85 dark:text-ctp-crust/85">
							<span aria-hidden="true"><Wallet size={14} /></span>
							Total Saldo
						</div>
						<p className="currency-display num mt-1">
							{formatIDR(data?.kinds?.total ?? 0)}
						</p>
					</section>

					{/* Quick Actions */}
					<section className="mt-3 grid grid-cols-2 gap-2" aria-label="Catat transaksi">
						<button
							type="button"
							onClick={() => openForm('income')}
							className="btn min-h-[44px] flex-1 bg-ctp-green/15 font-semibold text-ctp-green hover:bg-ctp-green/25 cursor-pointer"
						>
							<ArrowDownLeft size={18} /> Catat Pemasukan
						</button>
						<button
							type="button"
							onClick={() => openForm('expense')}
							className="btn min-h-[44px] flex-1 bg-ctp-red/15 font-semibold text-ctp-red hover:bg-ctp-red/25 cursor-pointer"
						>
							<ArrowUpRight size={18} /> Catat Pengeluaran
						</button>
					</section>

					{/* Digital & Cash Totals */}
					<section className="mt-3 grid grid-cols-2 gap-3" aria-label="Saldo per jenis dompet">
						<div className="card min-w-0 p-4">
							<div className="flex items-center gap-1.5 truncate text-xs text-ctp-subtext1">
								<span className="tile h-6 w-6 bg-ctp-surface0 text-ctp-subtext1">
									<Smartphone size={14} />
								</span>
								Digital
							</div>
							<p className="num mt-1 truncate text-base font-bold tabular-nums text-ctp-text sm:text-lg">
								{formatIDR(data?.kinds?.digital ?? 0)}
							</p>
						</div>

						<div className="card min-w-0 p-4">
							<div className="flex items-center gap-1.5 truncate text-xs text-ctp-subtext1">
								<span className="tile h-6 w-6 bg-ctp-surface0 text-ctp-subtext1">
									<Banknote size={14} />
								</span>
								Tunai
							</div>
							<p className="num mt-1 truncate text-base font-bold tabular-nums text-ctp-text sm:text-lg">
								{formatIDR(data?.kinds?.cash ?? 0)}
							</p>
						</div>
					</section>

					{/* Debt Summary Banner (if any open debts) */}
					{data?.openDebts && data.openDebts.length > 0 && (
						<section className="mt-4" aria-label="Ringkasan hutang">
							<Link
								to="/debts"
								className="card flex items-center justify-between p-4 hover:border-ctp-peach/50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<span className="tile h-9 w-9 bg-ctp-red/10 text-ctp-red">
										<TrendingDown size={18} />
									</span>
									<div>
										<p className="text-sm font-semibold text-ctp-text">
											{data.openDebts.length} Catatan Hutang Aktif
										</p>
										<p className="text-xs text-ctp-subtext0">
											Total sisa: {formatIDR(totalDebtsRemaining)}
										</p>
									</div>
								</div>
								<span className="text-xs font-semibold text-ctp-peach flex items-center gap-0.5">
									Kelola <ArrowUpRight size={14} />
								</span>
							</Link>
						</section>
					)}

					{/* 6-Month Trend Placeholder */}
					{data?.trend && data.trend.length > 0 && (
						<section className="mt-6" aria-label="Tren 6 Bulan">
							<div className="section-header">
								<h2 className="section-title">Tren Bulanan</h2>
							</div>
							<div className="card p-4 space-y-3">
								{data.trend.map((t) => (
									<div key={t.month} className="flex items-center justify-between text-xs">
										<span className="font-medium text-ctp-subtext0 w-16">{t.month}</span>
										<div className="flex items-center gap-3">
											<span className="num text-ctp-green font-semibold">
												+{formatIDR(t.income)}
											</span>
											<span className="num text-ctp-red font-semibold">
												−{formatIDR(t.expense)}
											</span>
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{/* Wallets List */}
					<section className="mt-6" aria-label="Daftar dompet">
						<div className="section-header">
							<h2 className="section-title">Dompet</h2>
							<Link to="/wallets" className="text-xs font-medium text-ctp-peach hover:text-ctp-maroon">
								Kelola
							</Link>
						</div>

						{(!data?.balances || data.balances.length === 0) ? (
							<div className="card flex flex-col items-center gap-1 py-10 text-center">
								<Wallet size={28} className="text-ctp-overlay0" />
								<p className="text-sm font-medium text-ctp-text">Belum ada dompet.</p>
								<p className="text-xs text-ctp-subtext0">
									Tambahkan dompet digital atau tunai untuk mulai mencatat.
								</p>
							</div>
						) : (
							<div className="space-y-4">
								{digitalWallets.length > 0 && (
									<div>
										<h3 className="text-xs font-medium text-ctp-subtext0 mb-1.5">Digital</h3>
										<ul className="list">
											{digitalWallets.map((w) => (
												<li key={w.id}>
													<Link to={`/transactions?wallet=${w.id}`} className="list-row">
														<span className="tile bg-ctp-surface0 text-ctp-subtext1">
															<Smartphone size={16} />
														</span>
														<span className="truncate text-sm font-medium text-ctp-text">
															{w.name}
														</span>
														<span
															className={`num ml-auto whitespace-nowrap text-sm font-bold tabular-nums ${
																w.balance < 0 ? 'text-ctp-red' : 'text-ctp-text'
															}`}
														>
															{formatIDR(w.balance)}
														</span>
													</Link>
												</li>
											))}
										</ul>
									</div>
								)}

								{cashWallets.length > 0 && (
									<div>
										<h3 className="text-xs font-medium text-ctp-subtext0 mb-1.5">Tunai</h3>
										<ul className="list">
											{cashWallets.map((w) => (
												<li key={w.id}>
													<Link to={`/transactions?wallet=${w.id}`} className="list-row">
														<span className="tile bg-ctp-surface0 text-ctp-subtext1">
															<Banknote size={16} />
														</span>
														<span className="truncate text-sm font-medium text-ctp-text">
															{w.name}
														</span>
														<span
															className={`num ml-auto whitespace-nowrap text-sm font-bold tabular-nums ${
																w.balance < 0 ? 'text-ctp-red' : 'text-ctp-text'
															}`}
														>
															{formatIDR(w.balance)}
														</span>
													</Link>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</section>

					{/* Recent Transactions */}
					<section className="mt-6" aria-label="Transaksi terakhir">
						<div className="section-header">
							<h2 className="section-title">Transaksi Terakhir</h2>
							<Link
								to="/transactions"
								className="flex items-center gap-0.5 text-sm text-ctp-peach hover:text-ctp-maroon font-medium"
							>
								Lihat semua <ArrowUpRight size={14} />
							</Link>
						</div>

						{(!data?.recent || data.recent.length === 0) ? (
							<div className="card flex flex-col items-center gap-1 py-10 text-center">
								<Plus size={28} className="text-ctp-overlay0" />
								<p className="text-sm font-medium text-ctp-text">Belum ada transaksi.</p>
								<p className="text-xs text-ctp-subtext0">
									Tekan Catat untuk menambahkan transaksi pertama.
								</p>
							</div>
						) : (
							<ul className="list">
								{data.recent.map((tx) => (
									<li key={tx.id} className="flex items-center gap-3 px-4 py-3">
										<span
											className={`tile ${
												tx.type === 'income'
													? 'bg-ctp-green/15 text-ctp-green'
													: tx.type === 'expense'
														? 'bg-ctp-red/15 text-ctp-red'
														: 'bg-ctp-blue/15 text-ctp-blue'
											}`}
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
											<p className="truncate text-sm font-medium text-ctp-text">
												{tx.description}
											</p>
											<p className="flex flex-wrap items-center gap-1.5 text-xs text-ctp-subtext0">
												<span>{tx.category} · {formatDate(tx.date)}</span>
												{tx.type === 'transfer' && tx.dest_wallet_name && (
													<span className="chip">
														→ {tx.dest_wallet_name}
													</span>
												)}
												<span className="chip">
													{tx.wallet_name}
												</span>
											</p>
										</div>
										<span
											className={`num whitespace-nowrap text-sm font-bold tabular-nums ${
												tx.type === 'transfer'
													? 'text-ctp-blue'
													: tx.type === 'income'
														? 'text-ctp-green'
														: 'text-ctp-red'
											}`}
										>
											{tx.type === 'income' ? '+' : '−'} {formatIDR(tx.amount)}
										</span>
									</li>
								))}
							</ul>
						)}
					</section>
				</>
			)}

			<TransactionForm
				open={showForm}
				initialType={formPreset}
				onClose={() => setShowForm(false)}
				wallets={(data?.balances ?? []) as WalletRow[]}
			/>
		</main>
	);
}
