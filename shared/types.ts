/** Shared API JSON shapes. Row types live in worker/db.ts (import type — erased at build). */
export type {
	WalletRow,
	WalletWithBalance,
	KindTotals,
	TxRow,
	TxInput,
	MonthlySummary,
	CategoryTotal,
	MonthlyTotal,
	DebtRow,
	DebtPaymentRow,
	BackupCounts,
	ImportBackupResult
} from '../worker/db';
export type { AiProviderSummary } from '../worker/aiProviders';
export type { BackupData } from './validation';

export interface DashboardData {
	kinds: import('../worker/db').KindTotals;
	summary: import('../worker/db').MonthlySummary;
	balances: import('../worker/db').WalletWithBalance[];
	recent: import('../worker/db').TxRow[];
	openDebts: import('../worker/db').DebtRow[];
	trend: import('../worker/db').MonthlyTotal[];
	month: string;
}


export interface AuthStatus {
	setupRequired: boolean;
	authenticated: boolean;
}

export interface ApiError {
	error: string;
}
