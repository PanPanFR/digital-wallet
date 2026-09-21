import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	Pencil,
	Trash2,
	Plus,
	Sparkles,
	CheckCircle2,
	TriangleAlert
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../hooks/useToast';
import { get, post, del } from '../api/client';
import { queryKeys } from '../lib/queryKeys';

interface ProviderSummary {
	id: string;
	name: string;
	baseUrl: string;
	model: string;
	models: string[];
}

interface ProvidersResponse {
	providers: ProviderSummary[];
	activeProviderId: string;
}

export default function Settings() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { notify } = useToast();

	// Password state
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [passwordSuccess, setPasswordSuccess] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);

	// Provider data
	const { data: providersData } = useQuery<ProvidersResponse>({
		queryKey: queryKeys.providers(),
		queryFn: () => get<ProvidersResponse>('/api/settings/providers')
	});
	const providers = providersData?.providers ?? [];
	const activeId = providersData?.activeProviderId ?? '';

	// Add provider form
	const [addName, setAddName] = useState('');
	const [addBaseUrl, setAddBaseUrl] = useState('');
	const [addApiKey, setAddApiKey] = useState('');
	const [addModels, setAddModels] = useState('');
	const [addError, setAddError] = useState('');
	const [adding, setAdding] = useState(false);

	// Edit provider form
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState('');
	const [editBaseUrl, setEditBaseUrl] = useState('');
	const [editApiKey, setEditApiKey] = useState('');
	const [editModels, setEditModels] = useState('');
	const [editError, setEditError] = useState('');
	const [editing, setEditing] = useState(false);

	// Delete provider
	const [deleteTarget, setDeleteTarget] = useState<ProviderSummary | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Backup import
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importing, setImporting] = useState(false);
	const [importError, setImportError] = useState('');
	const [importSummary, setImportSummary] = useState('');
	const [importConfirmOpen, setImportConfirmOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Change Password Handler
	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordError('');
		setPasswordSuccess(false);

		if (newPassword.length < 8) {
			setPasswordError('Password baru minimal 8 karakter');
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordError('Konfirmasi password tidak cocok');
			return;
		}

		setSavingPassword(true);
		try {
			await post('/api/settings/password', {
				old: currentPassword,
				new: newPassword
			});
			setPasswordSuccess(true);
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			notify('success', 'Password berhasil diubah');
		} catch (err: any) {
			setPasswordError(err?.message || 'Gagal mengubah password');
		} finally {
			setSavingPassword(false);
		}
	};

	// Add Provider Handler
	const handleAddProvider = async (e: React.FormEvent) => {
		e.preventDefault();
		setAddError('');
		setAdding(true);

		const modelsList = addModels
			.split(/[\n,]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		try {
			await post('/api/settings/providers', {
				name: addName.trim(),
				baseUrl: addBaseUrl.trim(),
				apiKey: addApiKey.trim(),
				models: modelsList
			});
			notify('success', 'Provider AI ditambahkan');
			setAddName('');
			setAddBaseUrl('');
			setAddApiKey('');
			setAddModels('');
			queryClient.invalidateQueries({ queryKey: queryKeys.providers() });
		} catch (err: any) {
			setAddError(err?.message || 'Gagal menambahkan provider');
		} finally {
			setAdding(false);
		}
	};

	// Start editing provider
	const openEdit = (p: ProviderSummary) => {
		setEditingId(p.id);
		setEditName(p.name);
		setEditBaseUrl(p.baseUrl);
		setEditApiKey('');
		setEditModels(p.models.join(', '));
		setEditError('');
	};

	// Save Edit Provider Handler
	const handleUpdateProvider = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingId) return;
		setEditError('');
		setEditing(true);

		const modelsList = editModels
			.split(/[\n,]+/)
			.map((s) => s.trim())
			.filter(Boolean);

		try {
			await post('/api/settings/providers', {
				id: editingId,
				name: editName.trim(),
				baseUrl: editBaseUrl.trim(),
				apiKey: editApiKey.trim(),
				models: modelsList
			});
			notify('success', 'Provider AI diperbarui');
			setEditingId(null);
			queryClient.invalidateQueries({ queryKey: queryKeys.providers() });
		} catch (err: any) {
			setEditError(err?.message || 'Gagal memperbarui provider');
		} finally {
			setEditing(false);
		}
	};

	// Set Active Provider
	const handleSetActive = async (id: string) => {
		try {
			await post('/api/settings/active', { id });
			notify('success', 'Provider aktif diubah');
			queryClient.invalidateQueries({ queryKey: queryKeys.providers() });
		} catch (err: any) {
			notify('error', err?.message || 'Gagal mengubah provider aktif');
		}
	};

	// Delete Provider Handler
	const handleDeleteProvider = async () => {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await del(`/api/settings/providers/${deleteTarget.id}`);
			notify('success', 'Provider AI dihapus');
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: queryKeys.providers() });
		} catch (err: any) {
			notify('error', err?.message || 'Gagal menghapus provider');
		} finally {
			setDeleting(false);
		}
	};

	// Import Backup Handler
	const handleImportBackup = async () => {
		if (!importFile) return;
		setImportConfirmOpen(false);
		setImporting(true);
		setImportError('');
		setImportSummary('');

		try {
			const text = await importFile.text();
			const json = JSON.parse(text);

			const res = await post<{
				success: boolean;
				inserted: Record<string, number>;
				skipped: Record<string, number>;
			}>('/api/backup/import', json);

			const x = Object.values(res.inserted || {}).reduce((a, b) => a + b, 0);
			const y = Object.values(res.skipped || {}).reduce((a, b) => a + b, 0);
			const msg = `Impor selesai: ${x} baru, ${y} dilewati.`;
			setImportSummary(msg);
			notify('success', msg);
			setImportFile(null);
			if (fileInputRef.current) fileInputRef.current.value = '';

			// Invalidate all data queries to refresh balances, tx, debts, providers
			queryClient.invalidateQueries();
		} catch (err: any) {
			setImportError(err?.message || 'Gagal mengimpor backup (file tidak valid)');
			notify('error', err?.message || 'Gagal mengimpor backup');
		} finally {
			setImporting(false);
		}
	};

	// Logout
	const handleLogout = async () => {
		try {
			await post('/api/auth/logout', {});
		} catch {
			// ignore
		}
		navigate('/login', { replace: true });
	};

	return (
		<main className="mx-auto max-w-md space-y-6 px-4 py-6 pb-28 md:pb-6">
			<header>
				<h1 className="page-title">Pengaturan</h1>
				<p className="page-subtitle mt-0.5">Ubah password &amp; kelola penyedia AI.</p>
			</header>

			{/* Ubah Password */}
			<section className="card space-y-4 p-4">
				<h2 className="section-title">Ubah Password</h2>

				{passwordSuccess && (
					<p
						className="rounded-lg border border-ctp-green/30 bg-ctp-green/10 px-3 py-2 text-sm text-ctp-green"
						role="status"
					>
						Password berhasil diubah.
					</p>
				)}

				<form onSubmit={handleChangePassword} className="space-y-3">
					<label className="block text-sm">
						<span className="label">Password saat ini</span>
						<input
							type="password"
							required
							autoComplete="current-password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							className="input"
						/>
					</label>
					<label className="block text-sm">
						<span className="label">Password baru (min. 8 karakter)</span>
						<input
							type="password"
							required
							minLength={8}
							autoComplete="new-password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="input"
						/>
					</label>
					<label className="block text-sm">
						<span className="label">Konfirmasi password baru</span>
						<input
							type="password"
							required
							minLength={8}
							autoComplete="new-password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="input"
						/>
					</label>

					{passwordError && (
						<p
							className="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
							role="alert"
						>
							{passwordError}
						</p>
					)}

					<button
						type="submit"
						disabled={savingPassword}
						className="btn btn-primary w-full"
					>
						{savingPassword ? 'Menyimpan…' : 'Simpan Password'}
					</button>
				</form>
			</section>

			{/* AI / Copilot */}
			<section className="card space-y-4 p-4">
				<h2 className="section-title flex items-center gap-1.5">
					<Sparkles size={16} className="text-ctp-peach" /> AI / Copilot
				</h2>
				<p className="text-sm text-ctp-subtext0">
					Tambahkan penyedia OpenAI-compatible (base URL + API key). Tanpa penyedia, Copilot memakai
					konfigurasi server (GOOGLE_API_KEY). API key disimpan di database — jangan bagikan akun ini.
				</p>

				{providers.length === 0 ? (
					<p className="text-sm text-ctp-subtext0">
						Belum ada penyedia. Tambahkan satu di bawah untuk memilih model dari halaman Copilot.
					</p>
				) : (
					<ul className="divide-y divide-ctp-surface0 dark:divide-ctp-surface0">
						{providers.map((p) => (
							<li key={p.id} className="py-3">
								{editingId === p.id ? (
									<form onSubmit={handleUpdateProvider} className="space-y-3">
										<label className="block text-sm">
											<span className="label">Nama</span>
											<input
												required
												maxLength={50}
												value={editName}
												onChange={(e) => setEditName(e.target.value)}
												className="input"
											/>
										</label>
										<label className="block text-sm">
											<span className="label">Base URL</span>
											<input
												type="url"
												required
												placeholder="https://…/v1"
												value={editBaseUrl}
												onChange={(e) => setEditBaseUrl(e.target.value)}
												className="input"
											/>
										</label>
										<label className="block text-sm">
											<span className="label">API key (kosongkan = tetap)</span>
											<input
												type="password"
												autoComplete="new-password"
												value={editApiKey}
												onChange={(e) => setEditApiKey(e.target.value)}
												className="input"
											/>
										</label>
										<label className="block text-sm">
											<span className="label">Model (pisahkan dengan koma, yang pertama jadi default)</span>
											<textarea
												required
												rows={2}
												value={editModels}
												onChange={(e) => setEditModels(e.target.value)}
												className="input"
											/>
										</label>
										{editError && <p className="text-xs text-ctp-red">{editError}</p>}
										<div className="flex justify-end gap-2">
											<button
												type="button"
												onClick={() => setEditingId(null)}
												className="btn btn-outline px-3 py-1.5"
											>
												Batal
											</button>
											<button
												type="submit"
												disabled={editing}
												className="btn btn-primary px-3 py-1.5"
											>
												{editing ? 'Menyimpan…' : 'Simpan'}
											</button>
										</div>
									</form>
								) : (
									<div className="flex items-center gap-3">
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{p.name}
												{p.id === activeId && (
													<span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-ctp-green">
														<CheckCircle2 size={12} /> aktif
													</span>
												)}
											</p>
											<p className="truncate text-xs text-ctp-subtext0">{p.baseUrl}</p>
										</div>
										{p.id !== activeId && (
											<button
												type="button"
												onClick={() => handleSetActive(p.id)}
												title="Jadikan aktif"
												className="rounded-lg px-2 py-1.5 text-xs font-medium text-ctp-peach transition-colors hover:bg-ctp-peach/10"
											>
												Aktifkan
											</button>
										)}
										<button
											type="button"
											onClick={() => openEdit(p)}
											title="Edit"
											className="btn btn-ghost rounded-lg p-1.5"
										>
											<Pencil size={15} />
										</button>
										<button
											type="button"
											onClick={() => setDeleteTarget(p)}
											title="Hapus"
											className="btn btn-ghost rounded-lg p-1.5 hover:text-ctp-red"
										>
											<Trash2 size={15} />
										</button>
									</div>
								)}
							</li>
						))}
					</ul>
				)}

				<form
					onSubmit={handleAddProvider}
					className="space-y-3 border-t border-ctp-surface0 pt-4 dark:border-ctp-surface1"
				>
					<p className="text-sm font-medium">Tambah penyedia</p>
					<label className="block text-sm">
						<span className="label">Nama</span>
						<input
							required
							maxLength={50}
							placeholder="cth. 9router, OpenAI, Groq"
							value={addName}
							onChange={(e) => setAddName(e.target.value)}
							className="input"
						/>
					</label>
					<label className="block text-sm">
						<span className="label">Base URL</span>
						<input
							type="url"
							required
							placeholder="https://…/v1"
							value={addBaseUrl}
							onChange={(e) => setAddBaseUrl(e.target.value)}
							className="input"
						/>
					</label>
					<label className="block text-sm">
						<span className="label">API key</span>
						<input
							type="password"
							autoComplete="new-password"
							required
							value={addApiKey}
							onChange={(e) => setAddApiKey(e.target.value)}
							className="input"
						/>
					</label>
					<label className="block text-sm">
						<span className="label">Model (pisahkan dengan koma, yang pertama jadi default)</span>
						<textarea
							required
							rows={2}
							placeholder="gemini-2.5-flash, gpt-4o-mini"
							value={addModels}
							onChange={(e) => setAddModels(e.target.value)}
							className="input"
						/>
					</label>
					{addError && <p className="text-xs text-ctp-red">{addError}</p>}
					<button type="submit" disabled={adding} className="btn btn-primary px-3 py-1.5">
						<Plus size={14} /> {adding ? 'Menyimpan…' : 'Tambah Penyedia'}
					</button>
				</form>
			</section>

			{/* Data / Backup */}
			<section className="card space-y-4 p-4">
				<h2 className="section-title">Data</h2>
				<div className="flex flex-wrap gap-2">
					<a className="btn btn-outline" href="/api/backup/export?format=json" download>
						Unduh Backup (JSON)
					</a>
					<a className="btn btn-outline" href="/api/backup/export?format=csv" download>
						Unduh Transaksi (CSV)
					</a>
				</div>
				<p className="notice-warn flex items-start gap-2 rounded-lg border border-ctp-yellow/30 bg-ctp-yellow/15 px-3 py-2 text-sm">
					<TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
					<span>File backup berisi API key — simpan baik-baik.</span>
				</p>

				{importSummary && (
					<p
						className="rounded-lg border border-ctp-green/30 bg-ctp-green/10 px-3 py-2 text-sm text-ctp-green"
						role="status"
					>
						{importSummary}
					</p>
				)}
				{importError && (
					<p
						className="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
						role="alert"
					>
						{importError}
					</p>
				)}

				<div className="space-y-3">
					<label className="block text-sm">
						<span className="label">File backup (JSON)</span>
						<input
							ref={fileInputRef}
							type="file"
							accept="application/json"
							onChange={(e) => setImportFile(e.target.files?.[0] || null)}
							className="input"
						/>
					</label>
					<button
						type="button"
						onClick={() => setImportConfirmOpen(true)}
						disabled={importing || !importFile}
						className="btn btn-primary px-3 py-1.5"
					>
						{importing ? 'Mengimpor…' : 'Impor Backup'}
					</button>
				</div>
			</section>

			{/* Sesi */}
			<section className="card space-y-4 p-4">
				<h2 className="section-title">Sesi</h2>
				<button
					type="button"
					onClick={handleLogout}
					className="btn btn-danger w-full py-2"
				>
					Keluar
				</button>
			</section>

			{/* Confirm Delete Provider Modal */}
			<ConfirmModal
				open={!!deleteTarget}
				title="Hapus Provider"
				message={
					deleteTarget
						? `Hapus "${deleteTarget.name}"? Tindakan ini tidak bisa dibatalkan.`
						: ''
				}
				confirmText={deleting ? 'Menghapus…' : 'Hapus'}
				onConfirm={handleDeleteProvider}
				onCancel={() => setDeleteTarget(null)}
			/>

			{/* Confirm Import Backup Modal */}
			<ConfirmModal
				open={importConfirmOpen}
				title="Konfirmasi Impor"
				message="Impor data dari backup? Data yang sudah ada tidak akan dihapus (id yang sama akan dilewati)."
				confirmText="Impor"
				destructive={false}
				onConfirm={handleImportBackup}
				onCancel={() => setImportConfirmOpen(false)}
			/>
		</main>
	);
}
