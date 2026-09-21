import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, CircleAlert } from 'lucide-react';
import { apiFetch, ApiError } from '../api/client';

export function Login() {
	const navigate = useNavigate();
	const [mode, setMode] = useState<'loading' | 'setup' | 'login'>('loading');
	const [password, setPassword] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		apiFetch<{ setupRequired: boolean; authenticated: boolean }>('/api/auth/status')
			.then((res) => {
				if (res.authenticated) {
					navigate('/', { replace: true });
				} else {
					setMode(res.setupRequired ? 'setup' : 'login');
				}
			})
			.catch((err) => {
				setError(err instanceof Error ? err.message : 'Gagal menghubungi server');
				setMode('login');
			});
	}, [navigate]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (submitting) return;

		setSubmitting(true);
		setError(null);

		const endpoint = mode === 'setup' ? '/api/auth/setup' : '/api/auth/login';

		try {
			await apiFetch(endpoint, {
				method: 'POST',
				body: JSON.stringify({ password })
			});
			navigate('/', { replace: true });
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError('Terjadi kesalahan saat masuk');
			}
		} finally {
			setSubmitting(false);
		}
	}

	if (mode === 'loading') {
		return (
			<main className="flex min-h-screen items-center justify-center bg-ctp-base px-4 dark:bg-ctp-crust">
				<div className="card w-full max-w-sm p-6 text-center text-sm text-ctp-subtext0">
					Memuat…
				</div>
			</main>
		);
	}

	const isSetup = mode === 'setup';

	return (
		<main className="flex min-h-screen items-center justify-center bg-ctp-base px-4 dark:bg-ctp-crust">
			<div className="card w-full max-w-sm space-y-4 p-6">
				<div className="flex flex-col items-center gap-2 text-center">
					<div className="tile h-10 w-10 bg-ctp-peach text-white shadow-xs dark:text-ctp-crust">
						<Wallet size={22} />
					</div>
					<h1 className="page-title">Digital Wallet</h1>
					<p className="text-sm text-ctp-subtext0">
						{isSetup ? 'Atur master password' : 'Masuk untuk melanjutkan'}
					</p>
				</div>

				{isSetup && (
					<p className="rounded-lg border border-ctp-surface0 bg-ctp-surface0/50 p-3 text-xs text-ctp-subtext1 dark:border-ctp-surface1">
						Ini pertama kalinya. Atur master password (min. 8 karakter). Password ini akan
						digunakan untuk masuk ke aplikasi.
					</p>
				)}

				<form onSubmit={handleSubmit} className="space-y-3">
					<label className="block text-sm">
						<span className="label">Password</span>
						<input
							name="password"
							type="password"
							required
							minLength={8}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete={isSetup ? 'new-password' : 'current-password'}
							className="input"
						/>
					</label>

					{error && (
						<p
							className="flex items-start gap-2 rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red"
							role="alert"
						>
							<CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
							<span>{error}</span>
						</p>
					)}

					<button
						type="submit"
						disabled={submitting}
						className="btn btn-primary w-full py-2"
					>
						{submitting ? 'Memproses…' : isSetup ? 'Atur & Masuk' : 'Masuk'}
					</button>
				</form>
			</div>
		</main>
	);
}

export default Login;
