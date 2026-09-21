import React from 'react';
import { X } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export default function Toast() {
	const { toasts, removeToast } = useToast();

	if (toasts.length === 0) return null;

	return (
		<div className="fixed bottom-20 md:bottom-4 right-4 z-50 space-y-2" aria-live="polite">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					role="status"
					className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-sm text-white dark:text-ctp-crust max-w-xs transition-all duration-150 ${
						toast.type === 'success' ? 'bg-ctp-green' : 'bg-ctp-red'
					}`}
				>
					<span>{toast.message}</span>
					<button
						type="button"
						className="opacity-70 hover:opacity-100 shrink-0"
						aria-label="Tutup notifikasi"
						onClick={() => removeToast(toast.id)}
					>
						<X size={16} />
					</button>
				</div>
			))}
		</div>
	);
}
