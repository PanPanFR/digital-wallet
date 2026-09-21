import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	Pencil,
	Trash2,
	Smartphone,
	Banknote,
	Wallet as WalletIcon,
	X,
	CircleAlert
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import ModalShell from '../components/ModalShell';
import Skeleton from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { formatIDR } from '@shared/format';
import { WalletSchema, fieldErrors } from '@shared/validation';
import { queryKeys } from '../lib/queryKeys';
import { get, post, patch, del, ApiError } from '../api/client';
import type { WalletWithBalance } from '@shared/types';

const PRESETS: { name: string; kind: 'digital' | 'cash' }[] = [
	{ name: 'GoPay', kind: 'digital' },
	{ name: 'OVO', kind: 'digital' },
	{ name: 'DANA', kind: 'digital' },
	{ name: 'ShopeePay', kind: 'digital' },
	{ name: 'Tunai', kind: 'cash' }
];

export default function Wallets() {
	const queryClient = useQueryClient();
	const { notify } = useToast();

	// Add wallet form state
	const [name, setName] = useState('');
	const [kind, setKind] = useState<'digital' | 'cash'>('digital');
	const [initialBalance, setInitialBalance] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Inline/modal edit state
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState('');
	const [editKind, setEditKind] = useState<'digital' | 'cash'>('digital');
	const [editErrors, setEditErrors] = useState<Record<string, string>>({});

	// Modals & error state
	const [deleteTarget, setDeleteTarget] = useState<WalletWithBalance | null>(null);
	const [listError, setListError] = useState('');

	// Adjust Saldo modal state
	const [adjustTarget, setAdjustTarget] = useState<WalletWithBalance | null>(null);
	const [adjustValue, setAdjustValue] = useState<string>('');
	const [adjustErrors, setAdjustErrors] = useState<Record<string, string>>({});

	// Fetch Wallets
	const { data, isLoading } = useQuery<{ wallets: WalletWithBalance[] }>({
		queryKey: queryKeys.wallets(),
		queryFn: () => get<{ wallets: WalletWithBalance[] }>('/api/wallets')
	});

	const wallets = data?.wallets ?? [];
	const digital = wallets.filter((w) => w.kind === 'digital');
	const cash = wallets.filter((w) => w.kind === 'cash');

	// Invalidation helper
	const invalidateAll = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['wallets'] }),
			queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
			queryClient.invalidateQueries({ queryKey: ['transactions'] })
		]);
	};

	// Create Mutation
	const createMutation = useMutation({
		mutationFn: (payload: { name: string; kind: 'digital' | 'cash'; initialBalance?: number }) =>
			post('/api/wallets', payload),
		onSuccess: async () => {
			await invalidateAll();
			notify('success', 'Dompet ditambahkan');
			setName('');
			setKind('digital');
			setInitialBalance('');
			setErrors({});
			setListError('');
		},
		onError: (err: unknown) => {
			if (err instanceof ApiError) {
				if (Object.keys(err.fieldErrors).length > 0) {
					setErrors(err.fieldErrors);
					return;
				}
				notify('error', err.message);
			} else {
				notify('error', 'Gagal menambahkan dompet');
			}
		}
	});

	// Update Mutation
	const updateMutation = useMutation({
		mutationFn: ({ id, payload }: { id: string; payload: { name: string; kind: 'digital' | 'cash' } }) =>
			patch(`/api/wallets/${id}`, payload),
		onSuccess: async () => {
			await invalidateAll();
			notify('success', 'Dompet diperbarui');
			setEditingId(null);
			setEditErrors({});
		},
		onError: (err: unknown) => {
			if (err instanceof ApiError) {
				if (Object.keys(err.fieldErrors).length > 0) {
					setEditErrors(err.fieldErrors);
					return;
				}
				notify('error', err.message);
			} else {
				notify('error', 'Gagal memperbarui dompet');
			}
		}
	});

	// Adjust Saldo Mutation
	const adjustMutation = useMutation({
		mutationFn: ({ id, balance }: { id: string; balance: number }) =>
			post(`/api/wallets/${id}/adjust`, { balance }),
		onSuccess: async () => {
			await invalidateAll();
			notify('success', 'Saldo diperbarui');
			setAdjustTarget(null);
			setAdjustErrors({});
		},
		onError: (err: unknown) => {
			if (err instanceof ApiError) {
				if (Object.keys(err.fieldErrors).length > 0) {
					setAdjustErrors(err.fieldErrors);
					return;
				}
				notify('error', err.message);
			} else {
				notify('error', 'Gagal mengatur saldo');
			}
		}
	});

	// Delete Mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string) => del(`/api/wallets/${id}`),
		onSuccess: async () => {
			await invalidateAll();
			setDeleteTarget(null);
			setListError('');
			notify('success', 'Dompet dihapus');
		},
		onError: (err: unknown) => {
			setDeleteTarget(null);
			if (err instanceof ApiError) {
				setListError(err.message);
			} else {
				setListError('Gagal menghapus dompet');
			}
		}
	});

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		const parsed = WalletSchema.safeParse({ name, kind });
		if (!parsed.success) {
			setErrors(fieldErrors(parsed.error));
			return;
		}
		const numBalance = initialBalance ? Number(initialBalance) : 0;
		setErrors({});
		createMutation.mutate({
			name: name.trim(),
			kind,
			initialBalance: numBalance > 0 ? numBalance : undefined
		});
	};

	const handleUpdate = (e: React.FormEvent, id: string) => {
		e.preventDefault();
		const parsed = WalletSchema.safeParse({ name: editName, kind: editKind });
		if (!parsed.success) {
			setEditErrors(fieldErrors(parsed.error));
			return;
		}
		setEditErrors({});
		updateMutation.mutate({ id, payload: { name: editName.trim(), kind: editKind } });
	};

	const handleAdjust = (e: React.FormEvent) => {
		e.preventDefault();
		if (!adjustTarget) return;
		const num = Number(adjustValue);
		if (isNaN(num) || num < 0) {
			setAdjustErrors({ newBalance: 'Saldo harus bilangan bulat positif' });
			return;
		}
		setAdjustErrors({});
		adjustMutation.mutate({ id: adjustTarget.id, balance: num });
	};

	const openEdit = (w: WalletWithBalance) => {
		setEditingId(w.id);
		setEditName(w.name);
		setEditKind(w.kind);
		setEditErrors({});
		setListError('');
	};

	const openAdjust = (w: WalletWithBalance) => {
		setAdjustTarget(w);
		setAdjustValue(String(w.balance));
		setAdjustErrors({});
		setListError('');
	};

	return (
		<main className="mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-6">
			<h1 className="page-title mb-4">Dompet</h1>

			{/* Add Form */}
			<form onSubmit={handleCreate} noValidate className="card mb-6 space-y-3 p-4">
				<div>
					<label htmlFor="wallet-name" className="label">Nama dompet</label>
					<input
						id="wallet-name"
						name="name"
						type="text"
						required
						placeholder="cth. GoPay, BCA, uang cash"
						value={name}
						onChange={(e) => setName(e.target.value)}
						aria-invalid={!!errors.name}
						className={`input ${errors.name ? 'border-ctp-red' : ''}`}
					/>
					{errors.name && <p className="mt-1 text-xs text-ctp-red">{errors.name}</p>}
				</div>

				<div>
					<span className="label">Jenis</span>
					<div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis dompet">
						<button
							type="button"
							aria-pressed={kind === 'digital'}
							onClick={() => setKind('digital')}
							className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
								kind === 'digital'
									? 'border-ctp-peach bg-ctp-peach/15 text-ctp-peach'
									: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0'
							}`}
						>
							<Smartphone size={14} /> Digital
						</button>
						<button
							type="button"
							aria-pressed={kind === 'cash'}
							onClick={() => setKind('cash')}
							className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
								kind === 'cash'
									? 'border-ctp-peach bg-ctp-peach/15 text-ctp-peach'
									: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0'
							}`}
						>
							<Banknote size={14} /> Tunai
						</button>
					</div>
					{errors.kind && <p className="mt-1 text-xs text-ctp-red">{errors.kind}</p>}
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					{PRESETS.map((p) => (
						<button
							key={p.name}
							type="button"
							onClick={() => {
								setName(p.name);
								setKind(p.kind);
								setErrors({});
							}}
							className={`chip py-1 transition-colors cursor-pointer ${
								name === p.name && kind === p.kind
									? 'bg-ctp-peach/20 text-ctp-peach ring-1 ring-inset ring-ctp-peach'
									: 'bg-ctp-surface0/60 text-ctp-subtext1 hover:bg-ctp-surface0'
							}`}
						>
							{p.name}
						</button>
					))}
				</div>

				<div>
					<label htmlFor="wallet-initial" className="label">Saldo awal (Rp, opsional)</label>
					<input
						id="wallet-initial"
						name="initialBalance"
						type="number"
						inputMode="numeric"
						min="0"
						step="1"
						placeholder="0"
						value={initialBalance}
						onChange={(e) => setInitialBalance(e.target.value)}
						aria-invalid={!!errors.initialBalance}
						className={`input num tabular-nums ${errors.initialBalance ? 'border-ctp-red' : ''}`}
					/>
					{errors.initialBalance && <p className="mt-1 text-xs text-ctp-red">{errors.initialBalance}</p>}
				</div>

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={createMutation.isPending}
						className="btn btn-primary px-4 py-2 cursor-pointer"
					>
						{createMutation.isPending ? 'Menambahkan…' : 'Tambah Dompet'}
					</button>
				</div>
			</form>

			{/* Error Banner */}
			{listError && (
				<p
					className="mb-4 flex items-center gap-2 rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
					role="alert"
				>
					<CircleAlert size={16} aria-hidden="true" />
					{listError}
				</p>
			)}

			{/* Wallet List */}
			{isLoading ? (
				<Skeleton rows={4} />
			) : wallets.length === 0 ? (
				<div className="card py-12 text-center">
					<div
						className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-surface0 text-ctp-subtext0"
						aria-hidden="true"
					>
						<WalletIcon size={22} />
					</div>
					<p className="text-sm font-medium text-ctp-text">Belum ada dompet</p>
					<p className="mt-1 text-xs text-ctp-subtext0">
						Tambahkan dompet pertama lewat formulir di atas.
					</p>
				</div>
			) : (
				<>
					{digital.length > 0 && (
						<section className="mb-6" aria-label="Dompet digital">
							<h2 className="section-title mb-2 flex items-center gap-1.5">
								<span className="text-ctp-subtext0"><Smartphone size={16} /></span> Digital
							</h2>
							<ul className="list">
								{digital.map((w) => (
									<li key={w.id}>
										{editingId === w.id ? (
											<form
												onSubmit={(e) => handleUpdate(e, w.id)}
												noValidate
												className="space-y-3 p-4"
											>
												<div>
													<label htmlFor={`edit-name-${w.id}`} className="label">Nama dompet</label>
													<input
														id={`edit-name-${w.id}`}
														type="text"
														required
														value={editName}
														onChange={(e) => setEditName(e.target.value)}
														aria-invalid={!!editErrors.name}
														className={`input ${editErrors.name ? 'border-ctp-red' : ''}`}
													/>
													{editErrors.name && (
														<p className="mt-1 text-xs text-ctp-red">{editErrors.name}</p>
													)}
												</div>

												<div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis dompet">
													<button
														type="button"
														aria-pressed={editKind === 'digital'}
														onClick={() => setEditKind('digital')}
														className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
															editKind === 'digital'
																? 'border-ctp-peach bg-ctp-peach/15 text-ctp-peach'
																: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0'
														}`}
													>
														<Smartphone size={14} /> Digital
													</button>
													<button
														type="button"
														aria-pressed={editKind === 'cash'}
														onClick={() => setEditKind('cash')}
														className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
															editKind === 'cash'
																? 'border-ctp-peach bg-ctp-peach/15 text-ctp-peach'
																: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0'
														}`}
													>
														<Banknote size={14} /> Tunai
													</button>
												</div>

												<div className="flex justify-end gap-2">
													<button
														type="button"
														onClick={() => setEditingId(null)}
														className="btn btn-outline px-4 py-2"
													>
														Batal
													</button>
													<button
														type="submit"
														disabled={updateMutation.isPending}
														className="btn btn-primary px-4 py-2"
													>
														{updateMutation.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
													</button>
												</div>
											</form>
										) : (
											<div className="list-row">
												<div
													className="tile h-9 w-9 bg-ctp-blue/15 text-ctp-blue"
													aria-hidden="true"
												>
													<Smartphone size={18} />
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-ctp-text">{w.name}</p>
													<p
														className={`num tabular-nums text-sm font-semibold ${
															w.balance < 0 ? 'text-ctp-red' : 'text-ctp-text'
														}`}
													>
														{formatIDR(w.balance)}
													</p>
												</div>
												<div className="flex gap-1">
													<button
														type="button"
														onClick={() => openAdjust(w)}
														aria-label={`Atur saldo ${w.name}`}
														className="btn btn-ghost rounded-lg p-1.5 cursor-pointer"
													>
														<WalletIcon size={15} />
													</button>
													<button
														type="button"
														onClick={() => openEdit(w)}
														aria-label={`Edit ${w.name}`}
														className="btn btn-ghost rounded-lg p-1.5 cursor-pointer"
													>
														<Pencil size={15} />
													</button>
													<button
														type="button"
														onClick={() => setDeleteTarget(w)}
														aria-label={`Hapus ${w.name}`}
														className="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red cursor-pointer"
													>
														<Trash2 size={15} />
													</button>
												</div>
											</div>
										)}
									</li>
								))}
							</ul>
						</section>
					)}

					{cash.length > 0 && (
						<section aria-label="Dompet tunai">
							<h2 className="section-title mb-2 flex items-center gap-1.5">
								<span className="text-ctp-subtext0"><Banknote size={16} /></span> Tunai
							</h2>
							<ul className="list">
								{cash.map((w) => (
									<li key={w.id}>
										{editingId === w.id ? (
											<form
												onSubmit={(e) => handleUpdate(e, w.id)}
												noValidate
												className="space-y-3 p-4"
											>
												<div>
													<label htmlFor={`edit-name-${w.id}`} className="label">Nama dompet</label>
													<input
														id={`edit-name-${w.id}`}
														type="text"
														required
														value={editName}
														onChange={(e) => setEditName(e.target.value)}
														aria-invalid={!!editErrors.name}
														className={`input ${editErrors.name ? 'border-ctp-red' : ''}`}
													/>
													{editErrors.name && (
														<p className="mt-1 text-xs text-ctp-red">{editErrors.name}</p>
													)}
												</div>

												<div className="grid grid-cols-2 gap-2" role="group" aria-label="Jenis dompet">
													<button
														type="button"
														aria-pressed={editKind === 'digital'}
														onClick={() => setEditKind('digital')}
														className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
															editKind === 'digital'
																? 'border-ctp-peach bg-ctp-peach/15 text-ctp-peach'
																: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0'
														}`}
													>
														<Smartphone size={14} /> Digital
													</button>
													<button
														type="button"
														aria-pressed={editKind === 'cash'}
														onClick={() => setEditKind('cash')}
														className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium transition-colors cursor-pointer ${
															editKind === 'cash'
																? 'border-ctp-peach bg-ctp-peach/15 text-ctp-peach'
																: 'border-ctp-surface0 text-ctp-subtext1 hover:bg-ctp-surface0'
														}`}
													>
														<Banknote size={14} /> Tunai
													</button>
												</div>

												<div className="flex justify-end gap-2">
													<button
														type="button"
														onClick={() => setEditingId(null)}
														className="btn btn-outline px-4 py-2"
													>
														Batal
													</button>
													<button
														type="submit"
														disabled={updateMutation.isPending}
														className="btn btn-primary px-4 py-2"
													>
														{updateMutation.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
													</button>
												</div>
											</form>
										) : (
											<div className="list-row">
												<div
													className="tile h-9 w-9 bg-ctp-peach/15 text-ctp-peach"
													aria-hidden="true"
												>
													<Banknote size={18} />
												</div>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-ctp-text">{w.name}</p>
													<p
														className={`num tabular-nums text-sm font-semibold ${
															w.balance < 0 ? 'text-ctp-red' : 'text-ctp-text'
														}`}
													>
														{formatIDR(w.balance)}
													</p>
												</div>
												<div className="flex gap-1">
													<button
														type="button"
														onClick={() => openAdjust(w)}
														aria-label={`Atur saldo ${w.name}`}
														className="btn btn-ghost rounded-lg p-1.5 cursor-pointer"
													>
														<WalletIcon size={15} />
													</button>
													<button
														type="button"
														onClick={() => openEdit(w)}
														aria-label={`Edit ${w.name}`}
														className="btn btn-ghost rounded-lg p-1.5 cursor-pointer"
													>
														<Pencil size={15} />
													</button>
													<button
														type="button"
														onClick={() => setDeleteTarget(w)}
														aria-label={`Hapus ${w.name}`}
														className="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red cursor-pointer"
													>
														<Trash2 size={15} />
													</button>
												</div>
											</div>
										)}
									</li>
								))}
							</ul>
						</section>
					)}
				</>
			)}

			{/* Confirm Delete Modal */}
			<ConfirmModal
				open={!!deleteTarget}
				title="Hapus Dompet"
				message={
					deleteTarget
						? `Hapus "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`
						: ''
				}
				confirmText={deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
				}}
				onCancel={() => setDeleteTarget(null)}
			/>

			{/* Atur Saldo Modal */}
			<ModalShell
				open={!!adjustTarget}
				title="Atur saldo"
				width="max-w-sm"
				onClose={() => setAdjustTarget(null)}
			>
				{adjustTarget && (
					<form onSubmit={handleAdjust} noValidate className="space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="font-semibold text-ctp-text">Atur Saldo — {adjustTarget.name}</h3>
							<button
								type="button"
								className="btn btn-ghost p-1.5"
								aria-label="Tutup dialog"
								onClick={() => setAdjustTarget(null)}
							>
								<X size={18} />
							</button>
						</div>
						<div>
							<label htmlFor="adjust-balance" className="label">Saldo baru</label>
							<input
								id="adjust-balance"
								name="newBalance"
								type="number"
								min="0"
								required
								value={adjustValue}
								onChange={(e) => setAdjustValue(e.target.value)}
								aria-invalid={!!adjustErrors.newBalance}
								className={`input num tabular-nums ${
									adjustErrors.newBalance ? 'border-ctp-red' : ''
								}`}
							/>
							{adjustErrors.newBalance && (
								<p className="mt-1 text-xs text-ctp-red">{adjustErrors.newBalance}</p>
							)}
						</div>
						<p className="text-xs text-ctp-subtext0">
							Saldo saat ini {formatIDR(adjustTarget.balance)}. Perubahan dicatat sebagai transaksi "Penyesuaian saldo".
						</p>
						<div className="flex justify-end gap-2">
							<button
								type="button"
								className="btn btn-outline px-3 py-2"
								onClick={() => setAdjustTarget(null)}
							>
								Batal
							</button>
							<button
								type="submit"
								disabled={adjustMutation.isPending}
								className="btn btn-primary px-3 py-2"
							>
								{adjustMutation.isPending ? 'Menyimpan…' : 'Simpan'}
							</button>
						</div>
					</form>
				)}
			</ModalShell>
		</main>
	);
}
