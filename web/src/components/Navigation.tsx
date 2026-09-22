import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
	Home,
	ArrowLeftRight,
	Wallet,
	HandCoins,
	Sparkles,
	Settings,
	LogOut,
	Ellipsis,
	Plus,
	X
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ModalShell from './ModalShell';
import { post } from '../api/client';

interface NavItem {
	href: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	group: 'primary' | 'secondary';
	subtitle?: string;
}

const items: NavItem[] = [
	{ href: '/', label: 'Beranda', icon: Home, group: 'primary' },
	{ href: '/transactions', label: 'Transaksi', icon: ArrowLeftRight, group: 'primary' },
	{ href: '/wallets', label: 'Dompet', icon: Wallet, group: 'primary' },
	{ href: '/debts', label: 'Hutang', icon: HandCoins, group: 'secondary', subtitle: 'Catatan hutang & piutang' },
	{ href: '/copilot', label: 'Copilot', icon: Sparkles, group: 'secondary', subtitle: 'Tanya soal keuanganmu' },
	{ href: '/settings', label: 'Pengaturan', icon: Settings, group: 'secondary', subtitle: 'Password & penyedia AI' }
];

const primaryMobileItems = items.filter((i) => i.group === 'primary');
const secondaryMobileItems = items.filter((i) => i.group === 'secondary');

export default function Navigation() {
	const location = useLocation();
	const navigate = useNavigate();
	const [isMoreOpen, setIsMoreOpen] = useState(false);

	// Close "Lainnya" sheet when route changes
	useEffect(() => {
		setIsMoreOpen(false);
	}, [location.pathname]);

	const isMoreActive =
		isMoreOpen || secondaryMobileItems.some((i) => location.pathname === i.href);

	const openTransactionForm = () => {
		window.dispatchEvent(new CustomEvent('open-transaction-form'));
	};

	const handleLogout = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await post('/api/auth/logout', {});
		} catch {
			// ignore logout failures
		}
		navigate('/login', { replace: true });
	};

	return (
		<>
			{/* Desktop sidebar */}
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-ctp-surface0 bg-ctp-mantle md:flex">
				<Link to="/" className="flex items-center gap-2 border-b border-ctp-surface0 px-4 py-4">
					<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ctp-peach text-ctp-crust">
						<Wallet size={17} />
					</span>
					<span className="font-semibold text-ctp-text">Digital Wallet</span>
				</Link>

				<nav aria-label="Navigasi utama" className="flex-1 space-y-1 overflow-y-auto p-3">
					{items.map((item) => {
						const active = location.pathname === item.href;
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								to={item.href}
								aria-current={active ? 'page' : undefined}
								className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
									active
										? 'bg-ctp-surface0 font-medium text-ctp-peach'
										: 'text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text'
								}`}
							>
								<Icon size={17} />
								{item.label}
							</Link>
						);
					})}
				</nav>

				<div className="flex items-center justify-between border-t border-ctp-surface0 p-3">
					<ThemeToggle />
					<form onSubmit={handleLogout} className="flex-1">
						<button
							type="submit"
							className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:bg-ctp-red/10 hover:text-ctp-red"
						>
							<LogOut size={17} /> Keluar
						</button>
					</form>
				</div>
			</aside>

			{/* Mobile bottom nav: dark floating pill */}
			<nav
				aria-label="Navigasi utama"
				className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden"
			>
				<div className="nav-pill grid grid-cols-5 items-center rounded-full px-2 py-1.5 shadow-lg backdrop-blur">
					{primaryMobileItems.slice(0, 2).map((item) => {
						const active = location.pathname === item.href;
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								to={item.href}
								aria-current={active ? 'page' : undefined}
								className={`flex min-h-[48px] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] transition-colors ${
									active ? 'font-semibold text-ctp-peach' : 'nav-pill-dim'
								}`}
							>
								<Icon size={20} />
								{item.label}
							</Link>
						);
					})}

					{/* Center FAB Catat */}
					<div className="flex justify-center">
						<button
							type="button"
							onClick={openTransactionForm}
							aria-label="Catat transaksi"
							className="nav-pill-ring flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-ctp-peach text-white shadow-md ring-4 transition-transform duration-150 active:scale-95 dark:text-ctp-crust"
						>
							<Plus size={22} />
						</button>
					</div>

					{/* Slot 4: Dompet */}
					{primaryMobileItems.slice(2, 3).map((item) => {
						const active = location.pathname === item.href;
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								to={item.href}
								aria-current={active ? 'page' : undefined}
								className={`flex min-h-[48px] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] transition-colors ${
									active ? 'font-semibold text-ctp-peach' : 'nav-pill-dim'
								}`}
							>
								<Icon size={20} />
								{item.label}
							</Link>
						);
					})}

					{/* Slot 5: Lainnya */}
					<button
						type="button"
						onClick={() => setIsMoreOpen(true)}
						aria-haspopup="dialog"
						aria-expanded={isMoreOpen}
						className={`flex min-h-[48px] min-w-0 w-full flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[10px] transition-colors ${
							isMoreActive ? 'font-semibold text-ctp-peach' : 'nav-pill-dim'
						}`}
					>
						<Ellipsis size={20} />
						Lainnya
					</button>
				</div>
			</nav>

			{/* ModalSheet for "Lainnya" */}
			<ModalShell
				variant="sheet"
				open={isMoreOpen}
				title="Menu Lainnya"
				onClose={() => setIsMoreOpen(false)}
			>
				<div className="flex items-center justify-between pb-2">
					<h3 className="font-semibold text-ctp-text">Menu Lainnya</h3>
					<button
						type="button"
						className="btn btn-ghost p-1.5"
						aria-label="Tutup menu"
						onClick={() => setIsMoreOpen(false)}
					>
						<X size={18} />
					</button>
				</div>
				<nav className="space-y-1" aria-label="Menu lainnya">
					{secondaryMobileItems.map((item) => {
						const active = location.pathname === item.href;
						const Icon = item.icon;
						return (
							<Link
								key={item.href}
								to={item.href}
								onClick={() => setIsMoreOpen(false)}
								aria-current={active ? 'page' : undefined}
								className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
									active
										? 'bg-ctp-surface0 text-ctp-peach'
										: 'text-ctp-subtext1 hover:bg-ctp-surface0 hover:text-ctp-text'
								}`}
							>
								<Icon size={20} />
								<span className="flex flex-col text-left">
									<span className="text-sm font-medium">{item.label}</span>
									{item.subtitle && (
										<span className="text-xs text-ctp-subtext1">{item.subtitle}</span>
									)}
								</span>
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center justify-between border-t border-ctp-surface0 pt-3 mt-3">
					<ThemeToggle />
					<form onSubmit={handleLogout} className="flex-1">
						<button
							type="submit"
							className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ctp-subtext1 transition-colors hover:bg-ctp-red/10 hover:text-ctp-red"
						>
							<LogOut size={17} /> Keluar
						</button>
					</form>
				</div>
			</ModalShell>
		</>
	);
}
