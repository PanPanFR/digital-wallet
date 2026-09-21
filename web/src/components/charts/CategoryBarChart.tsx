import React from 'react';
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid
} from 'recharts';
import { compactIDR, shortLabel } from './chartPalette';
import { formatIDR } from '@shared/format';

interface CategoryBarChartProps {
	data: Array<{ category: string; income: number; expense: number }>;
	height: number;
}

function CustomTooltip({ active, payload, label }: any) {
	if (active && payload && payload.length) {
		return (
			<div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-xs shadow-md">
				<p className="mb-1 font-semibold text-ctp-text">{label}</p>
				{payload.map((item: any) => (
					<div key={item.dataKey} className="flex items-center gap-2">
						<span
							className="h-2 w-2 rounded-sm"
							style={{ backgroundColor: item.color }}
							aria-hidden="true"
						/>
						<span className="text-ctp-subtext0">{item.name}:</span>
						<span className="font-semibold text-ctp-text">
							{formatIDR(Number(item.value) || 0)}
						</span>
					</div>
				))}
			</div>
		);
	}
	return null;
}

export default function CategoryBarChart({ data, height }: CategoryBarChartProps) {
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
						dataKey="category"
						tickFormatter={(v) => shortLabel(v, 14)}
						stroke="var(--color-ctp-subtext0)"
						tick={{ fontSize: 11 }}
						width={80}
					/>
					<Tooltip content={<CustomTooltip />} />
					<Bar
						dataKey="income"
						name="Pemasukan"
						fill="var(--color-ctp-green)"
						radius={[0, 4, 4, 0]}
						isAnimationActive={false}
					/>
					<Bar
						dataKey="expense"
						name="Pengeluaran"
						fill="var(--color-ctp-red)"
						radius={[0, 4, 4, 0]}
						isAnimationActive={false}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
