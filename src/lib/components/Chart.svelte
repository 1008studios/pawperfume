<script lang="ts">
	interface DataPoint {
		label: string;
		value: number;
		color?: string;
	}

	interface Props {
		data: DataPoint[];
		type?: 'bar' | 'line' | 'pie' | 'donut';
		width?: number;
		height?: number;
		showLabels?: boolean;
		showValues?: boolean;
		animate?: boolean;
	}

	let { 
		data, 
		type = 'bar',
		width = 400,
		height = 300,
		showLabels = true,
		showValues = true,
		animate = true
	}: Props = $props();

	const colors = [
		'#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
		'#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
	];

	function getColor(index: number): string {
		return colors[index % colors.length];
	}

	const maxValue = $derived(() => Math.max(...data.map(d => d.value), 1));
	const minValue = $derived(() => Math.min(...data.map(d => d.value), 0));

	// Bar chart calculations
	const barWidth = $derived(() => (width - 40) / data.length - 10);
	const scaleY = $derived(() => (height - 60) / (maxValue() - minValue()));

	// Pie/Donut chart calculations
	const total = $derived(() => data.reduce((sum, d) => sum + d.value, 0));
	const pieSlices = $derived(() => {
		let currentAngle = 0;
		return data.map((d, i) => {
			const percentage = d.value / total();
			const startAngle = currentAngle;
			const endAngle = currentAngle + (percentage * 360);
			currentAngle = endAngle;

			const startRad = (startAngle - 90) * Math.PI / 180;
			const endRad = (endAngle - 90) * Math.PI / 180;

			const radius = type === 'donut' ? 80 : 100;
			const innerRadius = type === 'donut' ? 50 : 0;

			const x1 = 150 + radius * Math.cos(startRad);
			const y1 = 150 + radius * Math.sin(startRad);
			const x2 = 150 + radius * Math.cos(endRad);
			const y2 = 150 + radius * Math.sin(endRad);

			const largeArcFlag = percentage > 0.5 ? 1 : 0;

			let path = `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

			if (type === 'donut') {
				const ix1 = 150 + innerRadius * Math.cos(startRad);
				const iy1 = 150 + innerRadius * Math.sin(startRad);
				const ix2 = 150 + innerRadius * Math.cos(endRad);
				const iy2 = 150 + innerRadius * Math.sin(endRad);
				path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1} Z`;
			}

			return {
				path,
				color: d.color || getColor(i),
				label: d.label,
				value: d.value,
				percentage: (percentage * 100).toFixed(1)
			};
		});
	});

	const linePoints = $derived(
		data.map((d, i) => {
			const x = 35 + i * (barWidth() + 10) + barWidth() / 2;
			const y = height - 40 - (d.value - minValue()) * scaleY();
			return `${x},${y}`;
		}).join(' ')
	);

	function formatValue(value: number): string {
		if (value >= 1000000) {
			return (value / 1000000).toFixed(1) + 'M';
		}
		if (value >= 1000) {
			return (value / 1000).toFixed(1) + 'K';
		}
		return value.toFixed(0);
	}
</script>

<div class="chart-container" style="width: {width}px; height: {height}px;">
	{#if type === 'bar'}
		<svg viewBox="0 0 {width} {height}" class="chart">
			<!-- Grid lines -->
			{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
				{@const y = height - 40 - (ratio * (height - 60))}
				<line 
					x1="30" 
					y1={y} 
					x2={width - 10} 
					y2={y} 
					stroke="var(--border)" 
					stroke-width="1"
					stroke-dasharray="4"
				/>
				{#if showValues}
					<text x="25" y={y + 4} text-anchor="end" class="axis-label">
						{formatValue(minValue() + ratio * (maxValue() - minValue()))}
					</text>
				{/if}
			{/each}

			<!-- Bars -->
			{#each data as point, i}
				{@const barHeight = (point.value - minValue()) * scaleY()}
				{@const x = 35 + i * (barWidth() + 10)}
				{@const y = height - 40 - barHeight}
				
				<rect
					x={x}
					y={y}
					width={barWidth()}
					height={barHeight}
					fill={point.color || getColor(i)}
					rx="4"
					class:animate
				/>

				{#if showLabels}
					<text 
						x={x + barWidth() / 2} 
						y={height - 20} 
						text-anchor="middle" 
						class="label"
					>
						{point.label}
					</text>
				{/if}

				{#if showValues}
					<text 
						x={x + barWidth() / 2} 
						y={y - 5} 
						text-anchor="middle" 
						class="value"
					>
						{formatValue(point.value)}
					</text>
				{/if}
			{/each}
		</svg>

	{:else if type === 'line'}
		<svg viewBox="0 0 {width} {height}" class="chart">
			<!-- Grid lines -->
			{#each [0, 0.25, 0.5, 0.75, 1] as ratio}
				{@const y = height - 40 - (ratio * (height - 60))}
				<line 
					x1="30" 
					y1={y} 
					x2={width - 10} 
					y2={y} 
					stroke="var(--border)" 
					stroke-width="1"
					stroke-dasharray="4"
				/>
			{/each}

			<!-- Line path -->
			<polyline
				points={linePoints}
				fill="none"
				stroke={getColor(0)}
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
				class:animate
			/>

			<!-- Points -->
			{#each data as point, i}
				{@const x = 35 + i * (barWidth() + 10) + barWidth() / 2}
				{@const y = height - 40 - (point.value - minValue()) * scaleY()}
				
				<circle
					cx={x}
					cy={y}
					r="5"
					fill="white"
					stroke={getColor(0)}
					stroke-width="3"
					class:animate
				/>

				{#if showLabels}
					<text x={x} y={height - 20} text-anchor="middle" class="label">
						{point.label}
					</text>
				{/if}
			{/each}
		</svg>

	{:else if type === 'pie' || type === 'donut'}
		<svg viewBox="0 0 300 300" class="chart">
			{#each pieSlices() as slice}
				<path
					d={slice.path}
					fill={slice.color}
					stroke="white"
					stroke-width="2"
					class:animate
				/>
			{/each}

			{#if type === 'donut'}
				<text x="150" y="145" text-anchor="middle" class="center-value">
					{formatValue(total())}
				</text>
				<text x="150" y="165" text-anchor="middle" class="center-label">
					Total
				</text>
			{/if}
		</svg>

		{#if showLabels}
			<div class="legend">
				{#each pieSlices() as slice}
					<div class="legend-item">
						<div class="legend-color" style="background: {slice.color}"></div>
						<span class="legend-label">{slice.label}</span>
						<span class="legend-value">{slice.percentage}%</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.chart-container {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.chart {
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.axis-label {
		font-size: 11px;
		fill: var(--text-tertiary);
	}

	.label {
		font-size: 12px;
		fill: var(--text-secondary);
		font-weight: 500;
	}

	.value {
		font-size: 11px;
		fill: var(--text);
		font-weight: 600;
	}

	.center-value {
		font-size: 24px;
		font-weight: 700;
		fill: var(--text);
	}

	.center-label {
		font-size: 12px;
		fill: var(--text-secondary);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: center;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}

	.legend-label {
		color: var(--text-secondary);
	}

	.legend-value {
		color: var(--text);
		font-weight: 600;
	}

	rect.animate,
	polyline.animate,
	path.animate,
	circle.animate {
		animation: fadeIn 0.6s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
