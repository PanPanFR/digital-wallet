import React from 'react';
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	Cell,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid
} from 'recharts';
import { CHART_PALETTE, compactIDR, shortLabel } from './chartPalette';
import { formatIDR } from '@shared/format';

interface WalletBarChartProps {
	data: Array<{ name: string; total: number }>;
	height: number;
}

function CustomTooltip({ active, payload }: any) {
	if (active && payload && payload.length) {
		const item = payload[0];
		return (
			<div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2.5 py-1.5 text-xs shadow-md">
				<p className="font-semibold text-ctp-text">{item.payload.name}</p>
				<p className="font-medium text-ctp-subtext0">{formatIDR(Number(item.value) || 0)}</p>
			</div>
		);
	}
	return null;
}

export default function WalletBarChart({ data, height }: WalletBarChartProps) {
	return (
		<div style={{ height: `${height}px`, width: '100%' }}>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={data}
					layout="vertical"
					margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						horizontal={false}
						stroke="var(--chart-grid, var(--color-ctp-surface0))"
					/>
					<XAxis
						type="number"
						tickFormatter={compactIDR}
						stroke="var(--color-ctp-subtext0)"
						tick={{ fontSize: 11 }}
					/>
					<YAxis
						type="category"
						dataKey="name"
						tickFormatter={(v) => shortLabel(v, 14)}
						stroke="var(--color-ctp-subtext0)"
						tick={{ fontSize: 11 }}
						width={80}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Bar dataKey="total" name="Pengeluaran" radius={[0, 4, 4, 0]} isAnimationActive={false}>
						{data.map((_, index) => (
							<Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
