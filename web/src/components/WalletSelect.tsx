import React from 'react';
import type { WalletRow } from '@shared/types';

type WalletItem = Pick<WalletRow, 'id' | 'name' | 'kind'>;

interface WalletSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	wallets?: WalletItem[];
	excludeId?: string;
	invalid?: boolean;
	placeholder?: string;
	placeholderDisabled?: boolean;
}

export default function WalletSelect({
	wallets = [],
	value,
	excludeId,
	invalid = false,
	required = false,
	placeholder = 'Pilih dompet',
	placeholderDisabled = true,
	className = '',
	...restProps
}: WalletSelectProps) {
	return (
		<select
			value={value}
			required={required}
			aria-invalid={invalid ? 'true' : undefined}
			className={`input ${invalid ? 'border-ctp-red' : ''} ${className}`}
			{...restProps}
		>
			{placeholder && (
				<option value="" disabled={placeholderDisabled}>
					{placeholder}
				</option>
			)}
			{(['digital', 'cash'] as const).map((kind) => {
				const group = wallets.filter(
					(w) => w.kind === kind && (!excludeId || w.id !== excludeId)
				);
				if (group.length === 0) return null;
				return (
					<optgroup key={kind} label={kind === 'digital' ? 'Digital' : 'Tunai'}>
						{group.map((w) => (
							<option key={w.id} value={w.id}>
								{w.name}
							</option>
						))}
					</optgroup>
				);
			})}
		</select>
	);
}
