import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastItem {
	id: number;
	type: ToastType;
	message: string;
}

interface ToastContextValue {
	toasts: ToastItem[];
	notify: (type: ToastType, message: string) => void;
	removeToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const removeToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const notify = useCallback(
		(type: ToastType, message: string) => {
			const id = nextId++;
			setToasts((prev) => [...prev, { id, type, message }]);
			setTimeout(() => {
				removeToast(id);
			}, 4000);
		},
		[removeToast]
	);

	return (
		<ToastContext.Provider value={{ toasts, notify, removeToast }}>
			{children}
		</ToastContext.Provider>
	);
}

export function useToast(): ToastContextValue {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error('useToast must be used within a ToastProvider');
	}
	return ctx;
}
