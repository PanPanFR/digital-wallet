import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CHART_PALETTE } from './chartPalette';
import { formatIDR } from '@shared/format';

interface CategoryDonutChartProps {
	data: Array<{ category: string; total: number }>;
}

function CustomTooltip({ active, payload }: any) {
	if (active && payload && payload.length) {
		const item = payload[0];
		return (
			<div className="rounded-lg border border-ctp-surface1 bg-ctp-mantle px-2.5 py-1.5 text-xs shadow-md">
				<p className="font-semibold text-ctp-text">{item.name}</p>
				<p className="font-medium text-ctp-subtext0">{formatIDR(Number(item.value) || 0)}</p>
			</div>
		);
	}
	return null;
}

export default function CategoryDonutChart({ data }: CategoryDonutChartProps) {
	return (
		<ResponsiveContainer width="100%" height="100%">
			<PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
				<Tooltip content={<CustomTooltip />} />
				<Pie
					data={data}
					dataKey="total"
					nameKey="category"
					innerRadius="65%"
					outerRadius="100%"
					paddingAngle={2}
					stroke="none"
					isAnimationActive={false}
				>
					{data.map((_, index) => (
						<Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
					))}
				</Pie>
			</PieChart>
		</ResponsiveContainer>
	);
}
