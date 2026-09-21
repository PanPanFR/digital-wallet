import React from 'react';
import { X } from 'lucide-react';
import ModalShell from './ModalShell';

interface ConfirmModalProps {
	open: boolean;
	title?: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	destructive?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmModal({
	open,
	title = 'Konfirmasi',
	message,
	confirmText = 'Hapus',
	cancelText = 'Batal',
	destructive = true,
	onConfirm,
	onCancel
}: ConfirmModalProps) {
	return (
		<ModalShell open={open} title={title} width="max-w-sm" onClose={onCancel}>
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-ctp-text">{title}</h3>
				<button
					type="button"
					className="btn btn-ghost p-1.5"
					aria-label="Tutup dialog"
					onClick={onCancel}
				>
					<X size={18} />
				</button>
			</div>
			<p className="text-sm text-ctp-subtext1">{message}</p>
			<div className="flex justify-end gap-2">
				<button type="button" className="btn btn-outline px-3 py-2" onClick={onCancel}>
					{cancelText}
				</button>
				<button
					type="button"
					className={`btn px-3 py-2 ${destructive ? 'btn-danger' : 'btn-primary'}`}
					onClick={onConfirm}
				>
					{confirmText}
				</button>
			</div>
		</ModalShell>
	);
}
