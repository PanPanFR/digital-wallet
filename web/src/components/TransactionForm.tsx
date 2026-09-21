import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, ArrowLeftRight, X } from 'lucide-react';
import ModalShell from './ModalShell';
import WalletSelect from './WalletSelect';
import { useToast } from '../hooks/useToast';
import { post, patch, ApiError } from '../api/client';
import { CATEGORIES, AMOUNT_PRESETS } from '@shared/constants';
import { todayISO } from '@shared/format';
import { TxSchema, fieldErrors } from '@shared/validation';
import type { TxRow, WalletRow } from '@shared/types';

interface TransactionFormProps {
	transaction?: TxRow | null;
	wallets?: WalletRow[];
	open?: boolean;
	initialType?: 'income' | 'expense' | 'transfer';
	onClose: () => void;
}

export default function TransactionForm({
	transaction = null,
	wallets = [],
	open = false,
	initialType = 'expense',
	onClose
}: TransactionFormProps) {
	const queryClient = useQueryClient();
	const { notify } = useToast();

	const isEdit = !!transaction;

	const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
	const [walletId, setWalletId] = useState('');
	const [toWalletId, setToWalletId] = useState('');
	const [description, setDescription] = useState('');
	const [amount, setAmount] = useState<string>('');
	const [category, setCategory] = useState<string>(CATEGORIES[0]);
	const [date, setDate] = useState(todayISO());
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (open) {
			if (transaction) {
				setType(transaction.type);
				setWalletId(transaction.wallet_id);
				setToWalletId(transaction.to_wallet_id ?? '');
				setDescription(transaction.description);
				setAmount(String(transaction.amount));
				setCategory(transaction.category || CATEGORIES[0]);
				setDate(transaction.date);
			} else {
				setType(initialType);
				setWalletId(wallets[0]?.id ?? '');
				setToWalletId('');
				setDescription('');
				setAmount('');
				setCategory(CATEGORIES[0]);
				setDate(todayISO());
			}
			setErrors({});
		}
	}, [open, transaction, initialType, wallets]);

	const mutation = useMutation({
		mutationFn: async (payload: unknown) => {
			if (isEdit && transaction) {
				return patch(`/api/transactions/${transaction.id}`, payload);
			}
			return post('/api/transactions', payload);
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['transactions'] }),
				queryClient.invalidateQueries({ queryKey: ['wallets'] }),
				queryClient.invalidateQueries({ queryKey: ['dashboard'] })
			]);
			notify('success', isEdit ? 'Transaksi diperbarui' : 'Transaksi tersimpan');
			onClose();
		},
		onError: (err: unknown) => {
			if (err instanceof ApiError) {
				if (Object.keys(err.fieldErrors).length > 0) {
					setErrors(err.fieldErrors);
					return;
				}
				notify('error', err.message);
			} else {
				notify('error', 'Terjadi kesalahan saat menyimpan transaksi');
			}
		}
	});

	const addPreset = (value: number) => {
		setAmount(String((Number(amount) || 0) + value));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const numAmount = Number(amount);

		const payload = {
			walletId,
			toWalletId: type === 'transfer' ? toWalletId : '',
			description: description.trim(),
			amount: numAmount,
			category: type === 'transfer' ? 'Lainnya' : category,
			type,
			date
		};

		const parsed = TxSchema.safeParse(payload);
		if (!parsed.success) {
			setErrors(fieldErrors(parsed.error));
			return;
		}

		setErrors({});
		mutation.mutate(payload);
	};

	return (
		<ModalShell open={open} labelledby="transaction-form-title" onClose={onClose}>
			<div className="flex items-center justify-between">
				<div>
					<h2 id="transaction-form-title" className="font-semibold text-ctp-text">
						{isEdit ? 'Edit Transaksi' : 'Catat Transaksi'}
					</h2>
					<p className="text-xs text-ctp-subtext0">
						{isEdit ? 'Ubah detail transaksi yang ada' : 'Tambahkan pengeluaran, pemasukan, atau transfer'}
					</p>
				</div>
				<button
					type="button"
					className="btn btn-ghost p-1.5"
					aria-label="Tutup dialog"
					disabled={mutation.isPending}
					onClick={onClose}
				>
					<X size={18} />
				</button>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4" noValidate>
				<div>
					<span className="label">Tipe</span>
					<div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipe transaksi">
						<button
							type="button"
							aria-pressed={type === 'expense'}
							onClick={() => setType('expense')}
							className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border py-2 px-1 text-xs sm:text-sm font-medium transition-colors ${
								type === 'expense'
									? 'border-ctp-red bg-ctp-red/10 text-ctp-red'
									: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0 dark:border-ctp-surface1 dark:hover:bg-ctp-surface0'
							}`}
						>
							<TrendingDown size={14} /> Pengeluaran
						</button>
						<button
							type="button"
							aria-pressed={type === 'income'}
							onClick={() => setType('income')}
							className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border py-2 px-1 text-xs sm:text-sm font-medium transition-colors ${
								type === 'income'
									? 'border-ctp-green bg-ctp-green/10 text-ctp-green'
									: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0 dark:border-ctp-surface1 dark:hover:bg-ctp-surface0'
							}`}
						>
							<TrendingUp size={14} /> Pemasukan
						</button>
						<button
							type="button"
							aria-pressed={type === 'transfer'}
							onClick={() => setType('transfer')}
							className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border py-2 px-1 text-xs sm:text-sm font-medium transition-colors ${
								type === 'transfer'
									? 'border-ctp-blue bg-ctp-blue/10 text-ctp-blue'
									: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0 dark:border-ctp-surface1 dark:hover:bg-ctp-surface0'
							}`}
						>
							<ArrowLeftRight size={14} /> Transfer
						</button>
					</div>
					{errors.type && <p className="text-xs text-ctp-red mt-1">{errors.type}</p>}
				</div>

				<div>
					<label htmlFor="tx-date" className="label">Tanggal</label>
					<input
						id="tx-date"
						name="date"
						type="date"
						value={date}
						onChange={(e) => setDate(e.target.value)}
						aria-invalid={!!errors.date}
						className={`input ${errors.date ? 'border-ctp-red' : ''}`}
					/>
					{errors.date && <p className="text-xs text-ctp-red mt-1">{errors.date}</p>}
				</div>

				<div>
					<label htmlFor="tx-wallet" className="label">
						{type === 'transfer' ? 'Dompet Asal' : 'Dompet'}
					</label>
					<WalletSelect
						id="tx-wallet"
						name="walletId"
						value={walletId}
						onChange={(e) => setWalletId(e.target.value)}
						required
						invalid={!!errors.walletId}
						wallets={wallets}
					/>
					{errors.walletId && <p className="text-xs text-ctp-red mt-1">{errors.walletId}</p>}
				</div>

				{type === 'transfer' && (
					<div>
						<label htmlFor="tx-to-wallet" className="label">Dompet Tujuan</label>
						<WalletSelect
							id="tx-to-wallet"
							name="toWalletId"
							value={toWalletId}
							onChange={(e) => setToWalletId(e.target.value)}
							excludeId={walletId}
							placeholder="Pilih dompet tujuan"
							required
							invalid={!!errors.toWalletId}
							wallets={wallets}
						/>
						{errors.toWalletId && <p className="text-xs text-ctp-red mt-1">{errors.toWalletId}</p>}
					</div>
				)}

				<div>
					<div className="flex items-center justify-between mb-1">
						<label htmlFor="tx-amount" className="label">Jumlah (IDR)</label>
						{amount && Number(amount) > 0 && (
							<span className="num text-xs font-semibold tabular-nums text-ctp-subtext0">
								Rp {Number(amount).toLocaleString('id-ID')}
							</span>
						)}
					</div>
					<div className="relative">
						<span className="input-prefix top-1/2 -translate-y-1/2" aria-hidden="true">Rp</span>
						<input
							id="tx-amount"
							name="amount"
							type="number"
							inputMode="numeric"
							min="1"
							step="1"
							required
							placeholder="0"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							aria-invalid={!!errors.amount}
							className={`input num pl-9 text-lg font-semibold tabular-nums ${
								errors.amount ? 'border-ctp-red' : ''
							}`}
						/>
					</div>
					{errors.amount && <p className="text-xs text-ctp-red mt-1">{errors.amount}</p>}
					<div className="mt-2 flex flex-wrap gap-1.5">
						{AMOUNT_PRESETS.map(([val, label]) => (
							<button
								key={label}
								type="button"
								className="chip transition-colors hover:bg-ctp-surface0 cursor-pointer"
								onClick={() => addPreset(val)}
							>
								{label}
							</button>
						))}
					</div>
				</div>

				<div>
					<label htmlFor="tx-description" className="label">Deskripsi</label>
					<input
						id="tx-description"
						name="description"
						type="text"
						required
						placeholder={
							type === 'transfer'
								? 'cth. Transfer bulanan, top-up e-wallet'
								: 'cth. Kopi susu, tiket KRL, gaji freelance'
						}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						aria-invalid={!!errors.description}
						className={`input ${errors.description ? 'border-ctp-red' : ''}`}
					/>
					{errors.description && <p className="text-xs text-ctp-red mt-1">{errors.description}</p>}
				</div>

				{type !== 'transfer' && (
					<div>
						<label htmlFor="tx-category" className="label">Kategori</label>
						<select
							id="tx-category"
							name="category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="input"
						>
							{CATEGORIES.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
						{errors.category && <p className="text-xs text-ctp-red mt-1">{errors.category}</p>}
					</div>
				)}

				<div className="flex justify-end gap-2 pt-2">
					<button
						type="button"
						disabled={mutation.isPending}
						onClick={onClose}
						className="btn btn-outline px-4 py-2"
					>
						Batal
					</button>
					<button
						type="submit"
						disabled={mutation.isPending}
						className="btn btn-primary px-4 py-2"
					>
						{mutation.isPending ? 'Menyimpan…' : isEdit ? 'Simpan' : 'Tambah'}
					</button>
				</div>
			</form>
		</ModalShell>
	);
}
