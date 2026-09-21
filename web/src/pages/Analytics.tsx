import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatIDR } from '@shared/format';
import { queryKeys } from '../lib/queryKeys';
import { get } from '../api/client';
import type { AnalyticsData } from '@shared/types';
import Skeleton from '../components/Skeleton';
import CategoryDonutChart from '../components/charts/CategoryDonutChart';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import WalletBarChart from '../components/charts/WalletBarChart';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart';
import {
	CHART_PALETTE,
	compactIDR,
	monthLong
} from '../components/charts/chartPalette';

function currentMonthISO(): string {
	return new Date().toISOString().slice(0, 7);
}

function signedIDR(value: number): string {
	if (value === 0) return formatIDR(0);
	return `${value < 0 ? '−' : '+'} ${formatIDR(Math.abs(value))}`;
}

export default function Analytics() {
	const [month, setMonth] = useState(currentMonthISO);

	const { data, isLoading } = useQuery<AnalyticsData>({
		queryKey: queryKeys.analytics(month),
		queryFn: () => get<AnalyticsData>(`/api/analytics?month=${month}`)
	});

	const monthLabel = useMemo(() => monthLong(month), [month]);

	const sumByType = useMemo(() => {
		if (!data?.categoryTotals) return { expense: 0, income: 0 };
		return {
			expense: data.categoryTotals
				.filter((c) => c.type === 'expense')
				.reduce((s, c) => s + c.total, 0),
			income: data.categoryTotals
				.filter((c) => c.type === 'income')
				.reduce((s, c) => s + c.total, 0)
		};
	}, [data?.categoryTotals]);

	const diff = sumByType.income - sumByType.expense;
	const catCount = data?.categoryTotals?.length ?? 0;

	const budgetPct = useMemo(() => {
		if (sumByType.income > 0) {
			return Math.min(100, Math.round((sumByType.expense / sumByType.income) * 100));
		}
		return sumByType.expense > 0 ? 100 : 0;
	}, [sumByType]);

	const expenseCats = useMemo(() => {
		return (data?.categoryTotals ?? []).filter((c) => c.type === 'expense');
	}, [data?.categoryTotals]);

	const categoryChart = useMemo(() => {
		if (!data?.categoryTotals) return [];
		const byCategory = new Map<string, { category: string; income: number; expense: number }>();
		for (const c of data.categoryTotals) {
			const cur = byCategory.get(c.category) ?? { category: c.category, income: 0, expense: 0 };
			if (c.type === 'income') cur.income += c.total;
			else cur.expense += c.total;
			byCategory.set(c.category, cur);
		}
		return [...byCategory.values()];
	}, [data?.categoryTotals]);

	const categoryChartHeight = useMemo(() => {
		return Math.min(520, Math.max(200, categoryChart.length * 36 + 80));
	}, [categoryChart.length]);

	const walletChart = useMemo(() => {
		if (!data?.walletTotals) return [];
		return data.walletTotals.map((w) => ({ name: w.name, total: w.total }));
	}, [data?.walletTotals]);

	const walletChartHeight = useMemo(() => {
		return Math.min(380, Math.max(160, walletChart.length * 36 + 70));
	}, [walletChart.length]);

	const hasMonthly = useMemo(() => {
		return (
			Array.isArray(data?.trend) &&
			data.trend.some((m) => m.income > 0 || m.expense > 0)
		);
	}, [data?.trend]);

	return (
		<main className="mx-auto max-w-3xl px-4 pt-6 pb-28 md:pb-6">
			{/* Page Header */}
			<div className="page-header flex-wrap">
				<div>
					<h1 className="page-title">Analitik</h1>
					<p className="page-subtitle">{monthLabel}</p>
				</div>
				<div className="flex items-center gap-2">
					<label htmlFor="analytics-month" className="text-sm text-ctp-subtext0">
						Bulan
					</label>
					<input
						id="analytics-month"
						name="month"
						type="month"
						value={month}
						onChange={(e) => setMonth(e.target.value || currentMonthISO())}
						className="input w-auto px-2.5 py-1.5"
					/>
				</div>
			</div>

			{isLoading ? (
				<Skeleton rows={5} />
			) : (
				<>
					{/* Dark summary card: donut + legend */}
					<section aria-label="Ringkasan" className="mb-6">
						<div className="card-dark p-5">
							<div className="mb-4 flex items-center justify-between gap-2">
								<h2 className="text-base font-bold">Ringkasan</h2>
								<span className="text-xs card-dark-dim">{monthLabel}</span>
							</div>

							{catCount === 0 ? (
								<p className="py-6 text-center text-sm card-dark-dim">
									Tidak ada data untuk {monthLabel}.
								</p>
							) : (
								<>
									{sumByType.expense > 0 ? (
										<div className="flex flex-col items-center gap-5 sm:flex-row">
											<div className="relative h-40 w-40 shrink-0">
												<div
													className="h-full w-full"
													role="img"
													aria-label="Proporsi pengeluaran per kategori"
												>
													<CategoryDonutChart data={expenseCats} />
												</div>
												<div
													className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
													aria-hidden="true"
												>
													<span className="text-[11px] leading-none card-dark-dim">
														Pengeluaran
													</span>
													<span className="num mt-1 text-sm leading-tight font-bold card-dark-strong">
														{compactIDR(sumByType.expense)}
													</span>
												</div>
											</div>

											<ul className="w-full space-y-1.5 text-sm" aria-label="Legenda proporsi pengeluaran">
												{expenseCats.map((cat, i) => {
													const pct = Math.round((cat.total / sumByType.expense) * 100);
													return (
														<li key={cat.category} className="flex items-center gap-2">
															<span
																className="h-2.5 w-2.5 shrink-0 rounded-full"
																style={{
																	backgroundColor:
																		CHART_PALETTE[i % CHART_PALETTE.length]
																}}
																aria-hidden="true"
															/>
															<span className="truncate card-dark-strong">{cat.category}</span>
															<span className="num ml-auto shrink-0 tabular-nums card-dark-dim">
																{pct}%
															</span>
															<span className="num shrink-0 font-semibold tabular-nums card-dark-strong">
																{formatIDR(cat.total)}
															</span>
														</li>
													);
												})}
											</ul>
										</div>
									) : (
										<p className="py-2 text-center text-sm card-dark-dim">
											Belum ada pengeluaran bulan ini.
										</p>
									)}

									<dl className="mt-4 space-y-2 border-t card-dark-divider pt-4 text-sm">
										<div className="flex items-center justify-between gap-2">
											<dt className="flex items-center gap-2 card-dark-dim">
												<span
													className="h-2.5 w-2.5 shrink-0 rounded-full bg-ctp-green"
													aria-hidden="true"
												/>
												Total Pemasukan
											</dt>
											<dd className="num font-bold tabular-nums card-dark-strong">
												+ {formatIDR(sumByType.income)}
											</dd>
										</div>
										<div className="flex items-center justify-between gap-2">
											<dt className="flex items-center gap-2 card-dark-dim">
												<span
													className="h-2.5 w-2.5 shrink-0 rounded-full bg-ctp-red"
													aria-hidden="true"
												/>
												Total Pengeluaran
											</dt>
											<dd className="num font-bold tabular-nums card-dark-strong">
												− {formatIDR(sumByType.expense)}
											</dd>
										</div>
										<div className="flex items-center justify-between gap-2">
											<dt className="flex items-center gap-2 card-dark-dim">
												<span
													className="h-2.5 w-2.5 shrink-0 rounded-full card-dark-dot"
													aria-hidden="true"
												/>
												Selisih
											</dt>
											<dd className="num font-bold tabular-nums card-dark-strong">
												{signedIDR(diff)}
											</dd>
										</div>
										<div className="flex items-center justify-between gap-2">
											<dt className="flex items-center gap-2 card-dark-dim">
												<span
													className="h-2.5 w-2.5 shrink-0 rounded-full card-dark-dot-dim"
													aria-hidden="true"
												/>
												Kategori aktif
											</dt>
											<dd className="num font-bold tabular-nums card-dark-dim">{catCount}</dd>
										</div>
									</dl>
								</>
							)}
						</div>
					</section>

					{/* Budget card */}
					<section aria-label="Anggaran bulan ini" className="mb-6">
						<div className="card p-5">
							<div className="flex items-center justify-between gap-2">
								<h2 className="section-title flex items-center gap-2">
									<span className="tile h-8 w-8 bg-ctp-blue/15 text-ctp-blue" aria-hidden="true">
										<Wallet size={16} />
									</span>
									Anggaran {monthLabel}
								</h2>
								<span className="chip bg-ctp-green/15 font-semibold text-ctp-green">
									{budgetPct}% Terpakai
								</span>
							</div>
							<div
								className="mt-4 h-3 overflow-hidden rounded-full bg-ctp-crust"
								role="progressbar"
								aria-valuenow={budgetPct}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-label="Persentase anggaran terpakai"
							>
								<div
									className="h-full rounded-full bg-ctp-blue"
									style={{ width: `${budgetPct}%` }}
								/>
							</div>
							<p className="mt-2 text-sm text-ctp-subtext0">
								Pengeluaran {formatIDR(sumByType.expense)} dari pemasukan{' '}
								{formatIDR(sumByType.income)}
							</p>
						</div>
					</section>

					{/* Category grid */}
					{data?.categoryTotals && data.categoryTotals.length > 0 && (
						<>
							<section aria-label="Kategori" className="mb-6">
								<h2 className="section-title mb-2">Kategori</h2>
								<ul className="grid grid-cols-2 gap-3">
									{data.categoryTotals.map((c) => {
										const typeTotal =
											c.type === 'income' ? sumByType.income : sumByType.expense;
										const share =
											typeTotal > 0 ? Math.round((c.total / typeTotal) * 100) : 0;
										return (
											<li key={c.category + c.type} className="card p-4">
												<div className="flex items-start justify-between gap-2">
													<span
														className={`tile h-10 w-10 ${
															c.type === 'income'
																? 'bg-ctp-green/15 text-ctp-green'
																: 'bg-ctp-red/15 text-ctp-red'
														}`}
														aria-hidden="true"
													>
														{c.type === 'income' ? (
															<TrendingUp size={18} />
														) : (
															<TrendingDown size={18} />
														)}
													</span>
													<span className="chip">{share}%</span>
												</div>
												<p className="mt-3 truncate text-sm text-ctp-subtext0">{c.category}</p>
												<p className="num text-sm font-bold tabular-nums text-ctp-text">
													{formatIDR(c.total)}
												</p>
											</li>
										);
									})}
								</ul>
							</section>

							{/* Comparison horizontal bars */}
							<section aria-label="Perbandingan per kategori" className="mb-6">
								<div className="card p-5">
									<h2 className="section-title mb-4">Per Kategori</h2>
									<div className="mb-2 flex justify-center gap-4 text-xs text-ctp-subtext0" aria-hidden="true">
										<span className="flex items-center gap-1">
											<span className="h-2.5 w-2.5 rounded-sm bg-ctp-green" /> Pemasukan
										</span>
										<span className="flex items-center gap-1">
											<span className="h-2.5 w-2.5 rounded-sm bg-ctp-red" /> Pengeluaran
										</span>
									</div>
									<CategoryBarChart data={categoryChart} height={categoryChartHeight} />
								</div>
							</section>
						</>
					)}

					{/* Wallet spend breakdown */}
					<section aria-label="Pengeluaran per dompet" className="mb-6">
						<div className="card p-5">
							<h2 className="section-title mb-4">Pengeluaran per Dompet</h2>
							{!data?.walletTotals ||
							data.walletTotals.length === 0 ||
							data.walletTotals.every((w) => w.total === 0) ? (
								<p className="py-6 text-center text-sm text-ctp-subtext0">
									Belum ada pengeluaran bulan ini.
								</p>
							) : (
								<>
									<WalletBarChart data={walletChart} height={walletChartHeight} />
									<ul className="mt-5 space-y-3">
										{data.walletTotals.map((w, i) => (
											<li key={w.id}>
												<div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
													<span className="flex min-w-0 items-center gap-2 font-medium text-ctp-text">
														<span
															className="h-2.5 w-2.5 shrink-0 rounded-full"
															style={{
																backgroundColor:
																	CHART_PALETTE[i % CHART_PALETTE.length]
															}}
															aria-hidden="true"
														/>
														<span className="truncate">{w.name}</span>
													</span>
													<span className="num ml-auto font-semibold tabular-nums text-ctp-text">
														{formatIDR(w.total)}
													</span>
												</div>
											</li>
										))}
									</ul>
								</>
							)}
						</div>
					</section>

					{/* 6-month trend */}
					<section aria-label="Tren 6 bulan terakhir">
						<div className="card p-5">
							<h2 className="section-title mb-4">Tren 6 Bulan</h2>
							<div className="mb-2 flex justify-center gap-4 text-xs text-ctp-subtext0" aria-hidden="true">
								<span className="flex items-center gap-1">
									<span className="h-2.5 w-2.5 rounded-sm bg-ctp-green" /> Pemasukan
								</span>
								<span className="flex items-center gap-1">
									<span className="h-2.5 w-2.5 rounded-sm bg-ctp-red" /> Pengeluaran
								</span>
							</div>
							<MonthlyTrendChart data={data?.trend ?? []} height={240} />
						</div>
					</section>
				</>
			)}
		</main>
	);
}
