import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const Login = lazy(() => import('./pages/Login'));

// Placeholder shell — filled in by plan 2.
function AppShell() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-ctp-base dark:bg-ctp-crust">
			<p className="text-ctp-subtext0 text-sm">Digital Wallet — loading…</p>
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
			<BrowserRouter>
				<Suspense fallback={<AppShell />}>
					<Routes>
						<Route path="/login" element={<Login />} />
						{/* All other routes → placeholder shell; plan 2 replaces this */}
						<Route path="/*" element={<AppShell />} />
					</Routes>
				</Suspense>
			</BrowserRouter>
		</QueryClientProvider>
	);
}
