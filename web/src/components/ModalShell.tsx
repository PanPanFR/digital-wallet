import React, { useEffect, useRef } from 'react';

interface ModalShellProps {
	open?: boolean;
	variant?: 'center' | 'sheet';
	title?: string;
	labelledby?: string;
	onClose: () => void;
	width?: string;
	children?: React.ReactNode;
}

export default function ModalShell({
	open = false,
	variant = 'center',
	title,
	labelledby,
	onClose,
	width = 'max-w-md',
	children
}: ModalShellProps) {
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		// Prevent background scrolling
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			document.body.style.overflow = originalOverflow;
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			className={`fixed inset-0 z-50 flex justify-center bg-ctp-crust/70 backdrop-blur-xs transition-opacity duration-150 ${
				variant === 'sheet' ? 'items-end' : 'items-center p-4'
			}`}
			onClick={onClose}
		>
			<div
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-label={title}
				aria-labelledby={labelledby}
				tabIndex={-1}
				className={`card w-full ${width} space-y-4 shadow-lg transition-transform duration-150 ${
					variant === 'sheet' ? 'rounded-b-none rounded-t-2xl p-5' : 'p-5'
				}`}
				onClick={(e) => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	);
}
