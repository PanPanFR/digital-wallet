export const queryKeys = {
	dashboard: (month?: string) => ['dashboard', month ?? ''] as const,
	wallets: () => ['wallets'] as const,
	transactions: (params?: Record<string, unknown>) => ['transactions', params ?? {}] as const,
	debts: () => ['debts'] as const,
	analytics: (month?: string) => ['analytics', month ?? ''] as const,
	providers: () => ['settings', 'providers'] as const
};
