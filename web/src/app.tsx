import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './hooks/useToast';
import Toast from './components/Toast';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Wallets = lazy(() => import('./pages/Wallets'));
const Debts = lazy(() => import('./pages/Debts'));

function AppShell() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-ctp-base dark:bg-ctp-crust">
			<p className="text-ctp-subtext0 text-sm">Digital Wallet — memuat…</p>
		</main>
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
							<Route path="/" element={<Dashboard />} />
							<Route path="/transactions" element={<Transactions />} />
							<Route path="/wallets" element={<Wallets />} />
							<Route path="/debts" element={<Debts />} />
							<Route path="/hutang" element={<Navigate to="/debts" replace />} />
							<Route path="/*" element={<Navigate to="/" replace />} />
						</Routes>
					</Suspense>
				</BrowserRouter>
				<Toast />
			</ToastProvider>
		</QueryClientProvider>
	);
}
