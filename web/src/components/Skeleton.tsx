import React from 'react';

interface SkeletonProps {
	rows?: number;
}

export default function Skeleton({ rows = 3 }: SkeletonProps) {
	return (
		<div role="status" aria-live="polite" aria-busy="true" className="space-y-2">
			<span className="sr-only">Memuat…</span>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					key={i}
					className="flex items-center gap-3 rounded-xl border border-ctp-surface0 bg-ctp-mantle px-4 py-3 dark:bg-ctp-base"
				>
					<div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-ctp-surface0" />
					<div className="min-w-0 flex-1 space-y-1.5">
						<div className="h-3 w-2/5 animate-pulse rounded bg-ctp-surface0" />
						<div className="h-3 w-1/4 animate-pulse rounded bg-ctp-surface0" />
					</div>
					<div className="h-3 w-20 animate-pulse rounded bg-ctp-surface0" />
				</div>
			))}
		</div>
	);
}
