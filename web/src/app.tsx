import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ToastProvider } from './hooks/useToast';
import Toast from './components/Toast';
import Navigation from './components/Navigation';
import TransactionForm from './components/TransactionForm';
import { queryKeys } from './lib/queryKeys';
import { get } from './api/client';
import type { WalletRow } from '@shared/types';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Wallets = lazy(() => import('./pages/Wallets'));
const Debts = lazy(() => import('./pages/Debts'));
const Copilot = lazy(() => import('./pages/Copilot'));
const Settings = lazy(() => import('./pages/Settings'));

function AppShell() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-ctp-base dark:bg-ctp-crust">
			<p className="text-ctp-subtext0 text-sm">Digital Wallet — memuat…</p>
		</main>
	);
}

function AppLayout() {
	const location = useLocation();
	const [showGlobalForm, setShowGlobalForm] = useState(false);

	const { data: walletsData } = useQuery<{ wallets: WalletRow[] }>({
		queryKey: queryKeys.wallets(),
		queryFn: () => get<{ wallets: WalletRow[] }>('/api/wallets')
	});

	// Quick-add FAB listener for secondary routes that don't have their own modal
	useEffect(() => {
		const handleOpen = () => {
			if (location.pathname !== '/' && location.pathname !== '/transactions') {
				setShowGlobalForm(true);
			}
		};
		window.addEventListener('open-transaction-form', handleOpen);
		return () => window.removeEventListener('open-transaction-form', handleOpen);
	}, [location.pathname]);

	return (
		<>
			<Navigation />
			<div className="min-h-screen pb-[calc(5rem_+_env(safe-area-inset-bottom))] md:pb-0 md:pl-56">
				<Outlet />
			</div>
			{showGlobalForm && (
				<TransactionForm
					open={showGlobalForm}
					wallets={walletsData?.wallets ?? []}
					initialType="expense"
					onClose={() => setShowGlobalForm(false)}
				/>
			)}
		</>
	);
}

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			staleTime: 10_000
		}
	}
});

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<BrowserRouter>
					<Suspense fallback={<AppShell />}>
						<Routes>
							<Route path="/login" element={<Login />} />
							<Route element={<AppLayout />}>
								<Route path="/" element={<Dashboard />} />
								<Route path="/transactions" element={<Transactions />} />
								<Route path="/wallets" element={<Wallets />} />
								<Route path="/debts" element={<Debts />} />
								<Route path="/hutang" element={<Navigate to="/debts" replace />} />
								<Route path="/copilot" element={<Copilot />} />
								<Route path="/settings" element={<Settings />} />
							</Route>
							<Route path="*" element={<Navigate to="/" replace />} />
						</Routes>
					</Suspense>
				</BrowserRouter>
				<Toast />
			</ToastProvider>
		</QueryClientProvider>
	);
}
